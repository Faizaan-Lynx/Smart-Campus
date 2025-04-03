import cv2
import redis
import logging
import datetime
import numpy as np
from celery import Celery
from config import settings
from ultralytics import YOLO
from models.cameras import Camera
from sqlalchemy.orm import Session
from core.database import SessionLocal
from api.alerts.schemas import AlertBase
from api.alerts.routes import create_alert

# Celery app
full_feed_worker_app = Celery('unified_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
full_feed_worker_app.conf.update(
    task_time_limit=60,
    broker_transport_options={'visibility_timeout': 3600},
    worker_heartbeat=60,
)

# Redis client
redis_client = redis.from_url(settings.REDIS_URL)

# Load YOLO model
model = YOLO(model="./yolo-models/yolov8n.pt")
model.to("cuda:0")

@full_feed_worker_app.task
def process_feed(camera_id: int):
    """
    Process a single feed source: capture frames, detect intrusions, and publish annotated frames if that websocket is open.
    This function is run as a Celery task.
    Args:
        camera_id (int): The ID of the camera to process.
    """
    try:
        # Fetch camera details from the database
        db: Session = SessionLocal()
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        db.close()

        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return {"error": "Camera not found"}

        # Create a VideoCapture object
        cap = cv2.VideoCapture(camera.url)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
        # cap.set(cv2.CAP_PROP_FPS, 5)

        if not cap.isOpened():
            logging.error(f"Could not open video stream for camera {camera_id} at URL {camera.url}")
            return {"error": "Failed to open video stream"}

        # Initialize Redis intrusion flag
        redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")

        while True:
            # Capture a frame
            ret, frame = cap.read()
            if not ret:
                logging.warning(f"Failed to read frame from camera {camera_id}")
                break

            # Preprocess the frame
            frame = preprocess_frame(frame, camera)

            # Run YOLO model for intrusion detection
            annotated_frame, intrusion_detected = detect_intrusion(frame, camera)

            # Publish the annotated frame
            publish_frame(camera_id, annotated_frame)

            # Handle intrusion event if detected
            if intrusion_detected:
                handle_intrusion_event(camera_id)

    except Exception as e:
        logging.exception(f"Error processing feed for camera {camera_id}: {e}")
    finally:
        cap.release()
        logging.info(f"Released VideoCapture object for camera {camera_id}")

    return {"status": "Feed processing completed"}

def preprocess_frame(frame, camera: Camera):
    """
    Preprocess the frame (resize, crop, etc.) based on the camera's settings.
    """
    if camera.crop_region:
        crop_region = eval(camera.crop_region)
        frame = frame[crop_region[0][1]:crop_region[1][1], crop_region[0][0]:crop_region[1][0]]

    if camera.resize_dims:
        resize_dims = eval(camera.resize_dims)
        frame = cv2.resize(frame, resize_dims)

    return frame

def detect_intrusion(frame, camera: Camera):
    """
    Detect intrusions in the frame using the YOLO model.
    """
    intrusion_detected = False
    results = model.predict(frame, classes=[0])  # Detect only specific classes (e.g., person)

    for res in results:
        for detection in res.boxes:
            x1, y1, x2, y2 = map(int, detection.xyxy[0])
            cx = (x1 + x2) / 2
            cy = (y1 + y2) / 2

            if centroid_near_line(cx, cy, eval(camera.lines)[0], eval(camera.lines)[1], camera.detection_threshold):
                intrusion_detected = True
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)  # Red box for intrusion
            else:
                cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)  # Green box for no intrusion

    return frame, intrusion_detected

def publish_frame(camera_id: int, annotated_frame: np.ndarray):
    """
    Publish the annotated frame to Redis.
    """
    _, buffer = cv2.imencode(".jpg", annotated_frame)
    redis_client.publish(f"camera_{camera_id}", buffer.tobytes())
    # logging.info(f"Published frame for camera {camera_id}")

def handle_intrusion_event(camera_id: int):
    """
    Handle an intrusion event: create an alert and set a timer to reset the intrusion flag.
    """
    alert_data = AlertBase(camera_id=camera_id, timestamp=str(datetime.now()), is_acknowledged=False, file_path=None)
    db = SessionLocal()
    create_alert(alert_data, db)
    db.close()

    redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
    full_feed_worker_app.send_task('unset_intrusion_flag', args=[camera_id], countdown=settings.INTRUSION_FLAG_DURATION)

@full_feed_worker_app.task
def unset_intrusion_flag(camera_id: int):
    """
    Unset the intrusion flag for a camera.
    """
    redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")
    logging.info(f"Unset intrusion flag for camera {camera_id}")

def centroid_near_line(centroid_x: float, centroid_y: float, line_point1: tuple, line_point2: tuple, threshold: float = 50) -> bool:
    """
    Determine if a centroid is near or has crossed a line defined by two points.
    """
    x1, y1 = line_point1
    x2, y2 = line_point2

    line_vector = np.array([x2 - x1, y2 - y1])
    centroid_vector = np.array([centroid_x - x1, centroid_y - y1])
    line_length = np.linalg.norm(line_vector)
    line_unit_vector = line_vector / line_length

    projection_length = np.dot(centroid_vector, line_unit_vector)

    if projection_length < 0:
        closest_point = np.array([x1, y1])
    elif projection_length > line_length:
        closest_point = np.array([x2, y2])
    else:
        closest_point = np.array([x1, y1]) + projection_length * line_unit_vector

    closest_distance = np.linalg.norm(np.array([centroid_x, centroid_y]) - closest_point)
    return closest_distance <= threshold