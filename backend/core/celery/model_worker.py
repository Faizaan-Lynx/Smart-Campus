import cv2
import redis
import logging
import datetime
import numpy as np
import time
import threading
import concurrent.futures
import hashlib
from config import settings
from ultralytics import YOLO
from models.cameras import Camera
from celery import Celery, signals
from core.database import SessionLocal
from api.alerts.schemas import AlertBase
from api.alerts.routes import create_alert
from core.celery.stream_worker import publish_frame

model_worker_app = Celery('model_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
model_worker_app.conf.update(
    task_time_limit=60,  
    broker_transport_options={'visibility_timeout': 3600},
    worker_heartbeat=60,
)

model = YOLO(model="./yolo-models/yolo26n.pt")
import torch
if torch.cuda.is_available():
    model.to("cuda:0")
else:
    model.to("cpu")
db = SessionLocal()
cameras = db.query(Camera).all()
cameras_dict = {c.id: c for c in cameras} # quick lookup for cameras {id : camera}
db.close()


@signals.worker_ready.connect
def load_model(**kwargs):
    """
    Load the machine learning model into memory.
    """
    try:
        # if worker_name is like format celery@model_worker1, only load the model for model workers
        if kwargs['sender'].hostname.startswith('celery@model_worker'):
            worker_name = kwargs['sender'].hostname
            logging.info(f"Model Worker {worker_name} is initializing...")

            global model
            logging.info("Model loaded successfully.")

            # run a dummy prediction to initialize the model
            img_size = settings.FEED_DIMS
            img_size = eval(img_size)
            dummy_image = np.zeros((img_size[0], img_size[1], 3), dtype=np.uint8)
            model.predict(dummy_image)
            
            logging.info(f"{worker_name}: Model initialized successfully.")

            # get all cameras from the database
            global cameras
            if cameras:
                logging.info(f"{worker_name}: Cameras loaded successfully.")
            else:
                logging.warning(f"{worker_name}: No cameras found.")
        else:
            worker_name = kwargs['sender'].hostname
            logging.info(f"Worker {worker_name} is not a model worker. Skipping model loading")

    except Exception as e:
        logging.exception(e)


@model_worker_app.task
def process_frame(camera_id: int, frame):
    """
    Uses model to process a frame and returns the processed frame.
    """
    try:
        global model
        global cameras

        camera = cameras_dict.get(camera_id, None)
        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return None
        
        det_threshold = camera.detection_threshold
        cv2lines = camera.lines

        # annotated_frame = np.frombuffer(frame, dtype=np.uint8)
        annotated_frame = np.array(frame, dtype=np.uint8)

        results = model.predict(annotated_frame, classes=[0])
        # results = model.predict(annotated_frame, classes=[0], verbose=False)
        
        redis_client = redis.from_url(settings.REDIS_URL)
        intrusion_flag = redis_client.get(f"camera_{camera_id}_intrusion_flag")
        intrusion_time_key = f"camera_{camera_id}_intrusion_time"
        last_intrusion_time = redis_client.get(intrusion_time_key)
        if last_intrusion_time:
            last_intrusion_time = float(last_intrusion_time)
        else:
            last_intrusion_time = 0
        current_time = time.time()
        
        for res in results:
            if res.boxes.id is None:
                continue
        
            for detection in res.boxes:
                x1, y1, x2, y2 = map(int, detection.xyxy[0])
                cx = (x1 + x2) / 2
                cy = (y1 + y2) / 2
                
                threshold_crossed_flag = centroid_near_line(cx, cy, cv2lines[0], cv2lines[1], threshold=det_threshold)
                
                if threshold_crossed_flag:
                    annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2) # draw red box around object
                    # Always allow new alerts
                    handle_intrusion_event(camera_id)
                    redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
                    redis_client.set(intrusion_time_key, str(current_time))
                    intrusion_flag = b"True"
                
                elif threshold_crossed_flag and intrusion_flag == b"True":
                    annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2) # draw red box around object
                
                else:
                    annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2) # draw green box around object
        
        # Show alert text only for a short duration (e.g., 2 seconds)
        ALERT_DURATION = 2  # seconds
        if intrusion_flag == b"True" and (current_time - last_intrusion_time) < ALERT_DURATION:
            annotated_frame = cv2.putText(annotated_frame, "Intrusion Detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
        elif intrusion_flag == b"True" and (current_time - last_intrusion_time) >= ALERT_DURATION:
            # Reset flag after duration
            redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")

        redis_client.close()

        _, buffer = cv2.imencode(".jpg", annotated_frame)
        annotated_frame = buffer.tobytes()

        publish_frame(camera_id, annotated_frame)

    except Exception as e:
        logging.exception(e)
        return None


# high priority task to update the cameras list
@model_worker_app.task
def update_cameras_for_model_workers():
    """
    Updates the cameras list from the database. Use whenever there is a change in the cameras (add, update, remove).
    Use with priority=0 to ensure that the cameras list is updated before processing any additional frames.
    """
    try:
        db = SessionLocal()
        global cameras, cameras_dict
        cameras = db.query(Camera).all()
        cameras_dict = {c.id: c for c in cameras}
        db.close()
        logging.info("Cameras list updated successfully.")

    except Exception as e:
        logging.exception(e)
        logging.error("Failed to update cameras.")


@model_worker_app.task
def unset_intrusion_flag(camera_id: int):
    """
    Unset the intrusion flag for a camera.
    """
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")
        redis_client.close()
        logging.info(f"Unset intrusion flag for camera {camera_id}.")

    except Exception as e:
        logging.exception(e)
        logging.error(f"Failed to unset intrusion flag for camera {camera_id}.")


def handle_intrusion_event(camera_id: int):
    """
    Handles the alert process for an intrusion event.
    Generates an alert in DB, sends an email, and sets a timer to unset the intrusion flag.
    """
    alert_data = AlertBase(camera_id=camera_id, timestamp=str(datetime.now()), is_acknowledged=False, file_path=None)
    
    db = SessionLocal()
    create_alert(alert_data, db)
    db.close()

    # unset the intrusion flag after a certain time
    unset_intrusion_flag.apply_async(args=[camera_id], countdown=settings.INTRUSION_FLAG_DURATION)


# check if object has crossed/is near the threshold line
def centroid_near_line(centroid_x:float, centroid_y:float, line_point1:tuple, line_point2:tuple, threshold:float=50) -> bool:
    """
    Determines if a centroid has crossed or is near a line defined by two points.

    Parameters:
    centroid_x (float): The x-coordinate of the centroid.
    centroid_y (float): The y-coordinate of the centroid.
    line_point1 (tuple): A tuple representing the first point of the line (x1, y1).
    line_point2 (tuple): A tuple representing the second point of the line (x2, y2).
    threshold (float): The distance threshold within which the centroid is considered near the line.

    Returns:
    bool: True if the centroid is near or has crossed the line, False otherwise.
    """
    # coords for line points
    x1, y1 = line_point1
    x2, y2 = line_point2

    # direction vector of the line segment
    line_vector = np.array([x2 - x1, y2 - y1])
    centroid_vector = np.array([centroid_x - x1, centroid_y - y1])
    line_length = np.linalg.norm(line_vector)
    line_unit_vector = line_vector / line_length

    # projection of the centroid onto the infinite line (normalized)
    projection_length = np.dot(centroid_vector, line_unit_vector)

    if projection_length < 0:
        closest_point = np.array([x1, y1])  # closest to line_point1
    elif projection_length > line_length:
        closest_point = np.array([x2, y2])  # closest to line_point2
    else:
        closest_point = np.array([x1, y1]) + projection_length * line_unit_vector  # closest point on the line segment

    # perpendicular distance from centroid to the closest point on the line segment
    closest_distance = np.linalg.norm(np.array([centroid_x, centroid_y]) - closest_point)

    return closest_distance <= threshold


class FrameGrabber(threading.Thread):
    def __init__(self, cap_factory):
        super().__init__()
        self.cap_factory = cap_factory
        self.cap = self.cap_factory()
        self.latest_frame = None
        self.running = True
        self.lock = threading.Lock()
        self.failed_reads = 0
        self.max_failed_reads = 30
        self.read_timeout = 2  # seconds
        self.last_frame_hash = None
        self.stuck_count = 0
        self.max_stuck_count = 10  # reconnect if same frame seen 10 times

    def run(self):
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                self._reconnect()
            frame = self._timed_read()
            if frame is not None:
                frame_hash = hashlib.md5(frame.tobytes()).hexdigest()
                if frame_hash == self.last_frame_hash:
                    self.stuck_count += 1
                else:
                    self.stuck_count = 0
                self.last_frame_hash = frame_hash
                if self.stuck_count >= self.max_stuck_count:
                    self._reconnect()
                    self.stuck_count = 0
                    continue
                with self.lock:
                    self.latest_frame = frame
                self.failed_reads = 0
            else:
                self.failed_reads += 1
                if self.failed_reads >= self.max_failed_reads:
                    self._reconnect()
                time.sleep(0.05)

    def _timed_read(self):
        with concurrent.futures.ThreadPoolExecutor(max_workers=1) as executor:
            future = executor.submit(self._read_frame)
            try:
                ret, frame = future.result(timeout=self.read_timeout)
                if ret:
                    return frame
            except Exception:
                pass
        return None

    def _read_frame(self):
        try:
            return self.cap.read()
        except Exception:
            return False, None

    def _reconnect(self):
        if self.cap:
            self.cap.release()
        while self.running:
            try:
                self.cap = self.cap_factory()
                if self.cap.isOpened():
                    self.failed_reads = 0
                    break
            except Exception:
                pass
            time.sleep(2)

    def get_latest_frame(self):
        with self.lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()


@model_worker_app.task
def process_camera_stream(camera_id: int, stream_url: str):
    """
    Continuously grabs frames from the camera, processes with YOLO, and publishes annotated frames in real-time.
    """
    try:
        def cap_factory():
            return cv2.VideoCapture(stream_url)
        grabber = FrameGrabber(cap_factory)
        grabber.start()
        redis_client = redis.from_url(settings.REDIS_URL)
        camera = cameras_dict.get(camera_id, None)
        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return None
        det_threshold = camera.detection_threshold
        cv2lines = camera.lines
        while True:
            frame = grabber.get_latest_frame()
            if frame is None:
                time.sleep(0.01)
                continue
            annotated_frame = np.array(frame, dtype=np.uint8)
            results = model.predict(annotated_frame, classes=[0])
            intrusion_flag = redis_client.get(f"camera_{camera_id}_intrusion_flag")
            intrusion_time_key = f"camera_{camera_id}_intrusion_time"
            last_intrusion_time = redis_client.get(intrusion_time_key)
            if last_intrusion_time:
                last_intrusion_time = float(last_intrusion_time)
            else:
                last_intrusion_time = 0
            current_time = time.time()
            for res in results:
                if res.boxes.id is None:
                    continue
                for detection in res.boxes:
                    x1, y1, x2, y2 = map(int, detection.xyxy[0])
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2
                    threshold_crossed_flag = centroid_near_line(cx, cy, cv2lines[0], cv2lines[1], threshold=det_threshold)
                    if threshold_crossed_flag:
                        annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        handle_intrusion_event(camera_id)
                        redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
                        redis_client.set(intrusion_time_key, str(current_time))
                        intrusion_flag = b"True"
                    elif threshold_crossed_flag and intrusion_flag == b"True":
                        annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    else:
                        annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
            ALERT_DURATION = 2
            if intrusion_flag == b"True" and (current_time - last_intrusion_time) < ALERT_DURATION:
                annotated_frame = cv2.putText(annotated_frame, "Intrusion Detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            elif intrusion_flag == b"True" and (current_time - last_intrusion_time) >= ALERT_DURATION:
                redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")
            _, buffer = cv2.imencode(".jpg", annotated_frame)
            annotated_frame = buffer.tobytes()
            publish_frame(camera_id, annotated_frame)
    except Exception as e:
        logging.exception(e)
    finally:
        grabber.stop()
        grabber.join()
        # No need to release cap, handled by grabber
        redis_client.close()