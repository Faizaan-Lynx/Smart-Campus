import logging
import numpy as np
from typing import List
from config import settings
from ultralytics import YOLO
from models.cameras import Camera
from celery import Celery, signals
from core.database import SessionLocal

model_worker_app = Celery('model_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
model = None
cameras = None

@signals.worker_ready.connect
def load_model():
    """
    Load the machine learning model into memory.
    """
    try:    
        global model
        model = YOLO(model="./yolo-models/yolov8n.pt")
        logging.info("Model loaded successfully.")

        # run a dummy prediction to initialize the model
        dummy_image = np.zeros((1280, 720, 3), dtype=np.uint8)
        model.predict(dummy_image)
        
        logging.info("Model initialized successfully.")

        # get all cameras from the database
        db = SessionLocal()
        global cameras
        cameras = db.query(Camera).all()
        db.close()
        logging.info("Cameras loaded successfully.")

    except Exception as e:
        logging.exception(e)


@model_worker_app.task
def process_frame(camera_id, frame):
    """
    Uses model to process a frame and returns the processed frame.
    """
    try:
        global model # model is never unloaded
        global cameras

        camera = next((c for c in cameras if c.id == camera_id), None)
        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return None
        
        det_threshold = camera.detection_threshold
        cv2lines = camera.lines
        
        # process the frame using the model
        results = model.predict(frame, classes=[0])
        # for res in results.xyxy[0]:
        

        
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
        global cameras
        cameras = db.query(Camera).all()
        db.close()
        logging.info("Cameras list updated successfully.")

    except Exception as e:
        logging.exception(e)
        logging.error("Failed to update cameras.")


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