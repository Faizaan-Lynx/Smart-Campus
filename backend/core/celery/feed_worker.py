import sys
import cv2
import logging
from celery import Celery
from config import settings
from celery import task
from core.database import get_db
from models.cameras import Camera
from sqlalchemy.orm import Session
from celery.signals import task_prerun
import time


feed_worker_app = Celery('feed_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)


capture_objects = {}

# extract the name of the queue
@task_prerun.connect
def task_prerun_handler(task_id, task, *args, **kwargs):
    print(f"Task {task_id} is about to be executed: {task.name}")


def fetch_and_process_cameras(db: Session, worker_id: int):
    """
    Fetch cameras assigned to this worker and continuously capture frames.
    This worker will fetch cameras by ID ranges based on worker_id.
    """
    start_camera_id = (worker_id - 1) * 10 + 1  # Worker 1: 1-10, Worker 2: 11-20, etc.
    end_camera_id = start_camera_id + 9

    cameras = db.query(Camera).filter(Camera.id >= start_camera_id, Camera.id <= end_camera_id).all()

    if not cameras:
        logging.warning(f"No cameras found for worker {worker_id}.")
        return

    logging.info(f"Worker {worker_id} will process cameras {start_camera_id}-{end_camera_id}")

    while True:
        for camera in cameras:
            logging.info(f"Worker {worker_id}: Capturing frame for camera {camera.id} at URL {camera.url}")
            capture_video_frames(camera)
            

def capture_video_frames(camera: Camera):
    """
    Capture frames from the video source (URL) using OpenCV and send them to a Celery queue.
    """
    if camera.id not in capture_objects:
        logging.info(f"Creating new VideoCapture object for camera {camera.id}")
        cap = cv2.VideoCapture(camera.url)

        if not cap.isOpened():
            logging.error(f"Could not open video stream for camera {camera.id} at URL {camera.url}")
            return

        capture_objects[camera.id] = cap
    else:
        cap = capture_objects[camera.id]

    ret, frame = cap.read()

    if not ret:
        logging.warning(f"Failed to read frame from camera {camera.id}, URL {camera.url}")
        return

    frame = process_frame(frame, camera)
    push_frame_to_queue(camera.id, frame)


def process_frame(frame, camera: Camera):
    """
    Process the frame (resize, crop, etc.) based on the camera's settings (e.g., resize_dims, crop_region).
    """

    if camera.resize_dims:
        width, height = map(int, camera.resize_dims.split('x'))
        frame = cv2.resize(frame, (width, height))

    if camera.crop_region:
        x1, y1, x2, y2 = map(int, camera.crop_region.split(','))
        frame = frame[y1:y2, x1:x2]

    return frame


@feed_worker_app.task
def push_frame_to_queue(camera_id, frame):
    """
    Push the processed frame to the unprocessed queue.
    """
    logging.info(f"Pushing frame for camera {camera_id} to unprocessed_queue")

    # Here, you can serialize and push the frame to a message queue.
    # For simplicity, we are just logging it as an example.

    return {"camera_id": camera_id, "frame": frame}


def release_capture_objects():
    """
    Release all the capture objects when done.
    """
    for camera_id, cap in capture_objects.items():
        logging.info(f"Releasing VideoCapture object for camera {camera_id}")
        cap.release()


if __name__ == "__main__":
    worker_id = int(sys.argv[1])  # For example, passing worker ID as an argument when running the worker

    # Start processing the cameras for this worker
    with get_db() as db:
        fetch_and_process_cameras(db, worker_id)

    # Release all capture objects after processing is done
    release_capture_objects()

# command to start the worker, include the worker ID as an argument when running the worker
# celery -A core.celery.feed_worker worker --loglevel=info --queues=unprocessed_queue
