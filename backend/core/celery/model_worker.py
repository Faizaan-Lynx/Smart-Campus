from celery import Celery, signals
from config import settings
from ultralytics import YOLO
import numpy as np
import logging

model_worker_app = Celery('model_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
model = None


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

    except Exception as e:
        logging.exception(e)
        logging.error("Error loading model.")


@model_worker_app.task
def process_frame(camera_id, frame):
    """
    Uses model to process a frame and returns the processed frame.
    """
    global model
    if model is None:
        logging.error("Model not loaded.")
        return None


def centroid_near_line():
    """
    """