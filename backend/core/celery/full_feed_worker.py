import cv2
import time
import redis
import logging
import numpy as np
from config import settings
from ultralytics import YOLO
from datetime import datetime
from celery import Celery, group
from models.cameras import Camera
from sqlalchemy.orm import Session
from core.database import SessionLocal
from api.alerts.schemas import AlertBase
from api.alerts.routes import create_alert


# celery worker for processing video feeds
full_feed_worker_app = Celery('unified_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)

## ===== General Video Processing ===== ##

@full_feed_worker_app.task
def process_feed(camera_id: int):
    """
    Process a single feed source: capture frames, detect intrusions, and publish annotated frames if that websocket is open.
    This function is run as a Celery task.
    Args:
        camera_id (int): The ID of the camera to process.
    """
    try:
        # get all cameras
        db: Session = SessionLocal()
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        db.close()

        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return {"error": "Camera not found"}

        cap = open_capture(camera.url, camera_id, max_tries=10, timeout=6)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        # Initialize Redis intrusion flag
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")

        stop_check_counter = 20

        # load yolo and move to GPU
        model = YOLO(model="./yolo-models/yolov8n.pt")
        model.to("cuda:0")
        logging.info(f"Loaded YOLO model for camera {camera_id}.")

        while True:
            ret, frame = cap.read()
            if not ret:
                logging.warning(f"Failed to read frame from camera {camera_id}. Attempting to reopen capture object...")
                cap = open_capture(camera.url, camera_id, max_tries=10, timeout=6)
                continue

            frame = preprocess_frame(frame, camera)

            redis_client.get(f"camera_{camera_id}_intrusion_flag")

            # annotated_frame, intrusion_detected = detect_intrusion(frame, camera)
            intrusion_detected = False
            results = model.predict(frame, classes=[0], verbose=False)

            for res in results:
                for detection in res.boxes:
                    x1, y1, x2, y2 = map(int, detection.xyxy[0])
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2

                    # if intrusion is detected, raise flag and draw red box, put text
                    if centroid_near_line(cx, cy, eval(camera.lines)[0], eval(camera.lines)[1], camera.detection_threshold):
                        intrusion_detected = True
                        annotated_frame = cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 0, 255), 2)  # Red box for intrusion
                        annotated_frame = cv2.putText(annotated_frame, "Intrusion Detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
                    else:
                        annotated_frame = cv2.rectangle(frame, (x1, y1), (x2, y2), (0, 255, 0), 2)  # Green box for no intrusion


            # only publish the frame if the websocket is open
            if redis_client.get(f"camera_{camera_id}_websocket_active") == b"True":
                publish_frame(camera_id, annotated_frame)

            # handle intrusion event if detected, and the flag is not already set (to avoid duplicate alerts)
            if intrusion_detected and redis_client.get(f"camera_{camera_id}_intrusion_flag") == b"False":
                handle_intrusion_event(camera_id)
            
            stop_check_counter -= 1
            if stop_check_counter <= 0:
                camera_running = redis_client.get(f"camera_{camera_id}_running")
                global_cameras_running = redis_client.get("feed_workers_running")

                if camera_running == b"False" or global_cameras_running == b"False":
                    logging.info(f"Stopping feed processing for camera {camera_id}.")
                    break

    except Exception as e:
        logging.exception(f"Error processing feed for camera {camera_id}: {e}")
    finally:
        cap.release()
        redis_client.close()
        logging.info(f"Released VideoCapture object for camera {camera_id}")

    return {"status": "Feed processing stopped."}


@full_feed_worker_app.task
def process_feed_without_model(camera_id: int):
    """
    Process a single feed source without using a model.
    This function is run as a Celery task.
    Args:
        camera_id (int): The ID of the camera to process.
    """
    try:
        # get relevant cameras
        db: Session = SessionLocal()
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        db.close()

        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return {"error": "Camera not found"}

        # cap = cv2.VideoCapture(camera.url)
        cap = open_capture(camera.url, camera_id, max_tries=10, timeout=6)
        cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)

        redis_client = redis.from_url(settings.REDIS_URL)

        while True:
            ret, frame = cap.read()
            if not ret:
                logging.warning(f"Failed to read frame from camera {camera_id}. Attempting to reopen capture object...")
                cap = open_capture(camera.url, camera_id, max_tries=10, timeout=6)
                continue

            frame = preprocess_frame(frame, camera)

            if redis_client.get(f"camera_{camera_id}_intrusion_flag") == b"True":
                publish_frame(camera_id, frame)

    except Exception as e:
        logging.exception(f"Error processing feed for camera {camera_id}: {e}")
    finally:
        redis_client.close()
        cap.release()
        logging.info(f"Released VideoCapture object for camera {camera_id}")

    return {"status": "Feed processing stopped."}


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

# redis client for publishing frames
redis_client_ws = redis.from_url(settings.REDIS_URL)

def publish_frame(camera_id: int, annotated_frame: np.ndarray):
    """
    Publish the annotated frame to Redis.
    """
    _, buffer = cv2.imencode(".jpg", annotated_frame)
    global redis_client_ws
    redis_client_ws.publish(f"camera_{camera_id}", buffer.tobytes())
    # logging.info(f"Published frame for camera {camera_id}")


def open_capture(url:str, camera_id:int, max_tries:int=10, timeout:int=6):
    """
    Reopen video capture object if failed
    """
    for attempt in range(0, max_tries):
        cap = cv2.VideoCapture(url)
        if cap.isOpened():
            logging.info(f"Video Capture object for Camera {camera_id} successfully created.")
            return cap
        else:
            logging.error(f"Attempt {attempt} of starting capture for Camera {camera_id} failed.")
            cap.release()
            time.sleep(timeout)
    logging.error(f"Failed to create Capture object for Camera {camera_id}")
    raise Exception(f"Failed to create Capture object for Camera {camera_id}")



## ====== Handling Intrusion Logic ===== ##




@full_feed_worker_app.task
def unset_intrusion_flag(camera_id: int):
    """
    Unset the intrusion flag for a camera.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")
    redis_client.close()
    logging.info(f"Unset intrusion flag for camera {camera_id}")


def handle_intrusion_event(camera_id: int):
    """
    Handle an intrusion event: create an alert and set a timer to reset the intrusion flag.
    """
    logging.warning(f"Intrusion detected for camera {camera_id}!!!")


    alert_data = AlertBase(camera_id=camera_id, timestamp=str(datetime.now()), is_acknowledged=False, file_path=None)
    db = SessionLocal()
    create_alert(alert_data, db)
    db.close()

    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
    redis_client.close()
    full_feed_worker_app.send_task('unset_intrusion_flag', args=[camera_id], countdown=settings.INTRUSION_FLAG_DURATION)


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




## ====== Celery Tasks for Starting and Stopping Feed Workers ===== ##




@full_feed_worker_app.task
def start_feed_worker(camera_id: int):
    """
    Start the feed worker for a specific camera.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"feed_worker_{camera_id}_running", "True")
    redis_client.close()

    db = SessionLocal()
    camera = db.query(Camera).filter(Camera.id == camera_id).first()
    db.close()

    if camera.detect_intrusions:
        full_feed_worker_app.send_task(
            "core.celery.full_feed_worker.process_feed",
            args=[camera_id],
            queue="feed_tasks"
        )
    else:
        full_feed_worker_app.send_task(
            "core.celery.full_feed_worker.process_feed_without_model",
            args=[camera_id],
            queue="feed_tasks"
        )
    return f"Feed worker started for camera {camera_id}"


@full_feed_worker_app.task
def start_all_feed_workers(camera_ids: list):
    """
    Start feed workers for all cameras.
    """

    if not camera_ids or len(camera_ids) == 0:
        logging.warning("No cameras found to start feed workers.")
        return "No cameras found"
    
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("feed_workers_running", "True")
    redis_client.close()

    tasks = group(start_feed_worker.s(camera_id) for camera_id in camera_ids)
    result = tasks.apply_async(queue="feed_tasks", priority=10)
    return result


@full_feed_worker_app.task
def stop_feed_worker(camera_id: int):
    """
    Stop the feed worker for a specific camera.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("feed_workers_running", "False")
    return f"Feed worker stopping for camera {camera_id}..."


@full_feed_worker_app.task
def stop_all_feed_workers():
    """
    Stop all feed workers.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("feed_workers_running", "False")
    redis_client.close()
    return "All feed workers stopping..."