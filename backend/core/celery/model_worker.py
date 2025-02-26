# call this worker with the following command:
# celery -A core.celery.worker worker --loglevel=info --queues=unprocessed_queue

from celery import Celery
from celery import task
from config import settings
import time
from ultralytics import YOLO

model_worker_app = Celery('model_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)

# global model
model = None

def load_model():
    """
    Load the machine learning model into memory.
    """

    global model
    model = YOLO(model="./yolo-models/yolov8n.pt")
    print("Model loaded successfully.")


# frame processing task
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