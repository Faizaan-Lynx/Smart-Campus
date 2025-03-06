import os
import sys
import cv2
import asyncio
import logging
from config import settings
from models.cameras import Camera
from sqlalchemy.orm import Session
from celery import Celery, signals
from core.database import SessionLocal
from .model_worker import process_frame

feed_worker_app = Celery('feed_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)

capture_objects = {}
feed_running_flag = True

@feed_worker_app.task # manually trigger task if needed
@signals.worker_ready.connect # automatically trigger task on worker startup
def fetch_and_process_cameras(**kwargs):
    """
    Fetch cameras assigned to this worker and continuously capture frames.
    This worker will fetch cameras by ID ranges based on worker_id.
    """
    db : Session = SessionLocal()

    # assume that default point of entry for this task is worker startup
    try:
        worker_name = kwargs['sender'].hostname.split('@')[1]
    except (KeyError, AttributeError) as e:
        worker_name = fetch_and_process_cameras.request.hostname.split('@')[1]
    except Exception as e:
        worker_name = "celery@worker1"

    # worker name will be celery@worker_name, worker_name is in format worker1, worker2, etc.
    worker_id = int(worker_name.split('r')[-1])

    start_camera_id = (worker_id - 1) * 10 + 1
    end_camera_id = start_camera_id + 9
    
    logging.info(f"Feed Worker {worker_id} will process cameras {start_camera_id}-{end_camera_id}")

    worker_cameras = db.query(Camera).filter(Camera.id >= start_camera_id, Camera.id <= end_camera_id).all()
    url = worker_cameras[0].url
    

    logging.info(f"Checking if file exists at URL {url}")
    if not os.path.exists(url):
        logging.error(f"File does not exist at URL {url}")
    else:
        logging.info(f"File exists at URL {url}")


    if not worker_cameras:
        logging.warning(f"No cameras found for worker {worker_id}.")
        return
    
    # main working loop to capture frames
    while feed_running_flag:
        for camera in worker_cameras:
            capture_video_frames(camera)
            asyncio.sleep(0.005) # non-busy sleep to allow other tasks to run such as stopping

    release_capture_objects()
    logging.info("Feed worker stopped. Capture objects released.")

    return {"status": "Feed worker stopped."}


# main worker function
def capture_video_frames(camera: Camera):
    """
    Capture frames from the video source (URL) using OpenCV and send them to a Celery queue.
    """
    if camera.id in capture_objects:
        cap = capture_objects[camera.id]
    else:
        logging.info(f"Creating new VideoCapture object for camera {camera.id}")
        cap = cv2.VideoCapture(camera.url)
        if not cap.isOpened():
            logging.error(f"Could not open video stream for camera {camera.id} at URL {camera.url}")
            return
        capture_objects[camera.id] = cap

    # read the frame
    ret, frame = cap.read()

    if not ret:
        logging.warning(f"Failed to read frame from camera {camera.id}, URL {camera.url}")
        return

    frame = preprocess_frame(frame, camera)
    process_frame.apply_async(args=[camera.id, frame], queue='model_tasks')


def preprocess_frame(frame, camera: Camera):
    """
    Preprocess the frame (resize, crop, etc.) based on the camera's settings (e.g., resize_dims, crop_region).
    """

    if camera.resize_dims:
        width, height = map(int, camera.resize_dims.split('x'))
        frame = cv2.resize(frame, (width, height))

    if camera.crop_region:
        x1, y1, x2, y2 = map(int, camera.crop_region.split(','))
        frame = frame[y1:y2, x1:x2]

    return frame


def release_capture_objects():
    """
    Release all the capture objects when done.
    """
    for camera_id, cap in capture_objects.items():
        logging.info(f"Releasing VideoCapture object for camera {camera_id}")
        cap.release()


@feed_worker_app.task
def stop_feed_worker():
    """
    Task to stop the feed worker by setting the stop flag.
    """
    global stop_flag
    stop_flag = True
    logging.info("Stop signal set. Worker is stopping...")