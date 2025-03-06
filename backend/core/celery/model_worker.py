from celery import Celery, signals
from config import settings
import time
from ultralytics import YOLO
import numpy as np
import logging

model_worker_app = Celery('model_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)

# global model
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
def process_frame(stream_id, frame_data):
    """

    """
    
    processed_frame = f"Processed frame for stream {stream_id} with model"
    
    print(f"Stream {stream_id}: Frame processed and ready for streaming.")
    return processed_frame


if __name__ == "__main__":
    load_model()
    print("Model worker is ready to process frames.")