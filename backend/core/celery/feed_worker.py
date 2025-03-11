import os
import cv2
import time
import asyncio
import logging
from typing import List
from config import settings
from models.cameras import Camera
from sqlalchemy.orm import Session
from celery import Celery, signals
from core.database import SessionLocal


feed_worker_app = Celery('feed_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
worker_id = None
capture_objects = {}
feed_running_flag = True


@signals.worker_ready.connect # automatically trigger task on worker startup
def fetch_and_process_cameras(**kwargs):
    """
    This worker will fetch cameras by ID ranges based on worker_id.
    """

    # assume that default point of entry for this task is worker startup
    try:
        worker_name = kwargs['sender'].hostname.split('@')[1]
    except Exception as e:
        worker_name = fetch_and_process_cameras.request.hostname.split('@')[1]

    # worker name will be celery@feed_worker(num)
    global worker_id
    worker_id = int(worker_name.split('feed_worker')[-1])

    start_camera_id = (worker_id - 1) * 10 + 1
    end_camera_id = start_camera_id + 9
    
    logging.info(f"Feed Worker {worker_id} will process cameras {start_camera_id}-{end_camera_id}")

    db : Session = SessionLocal()    
    worker_cameras = db.query(Camera).filter(Camera.id >= start_camera_id, Camera.id <= end_camera_id).all()
    db.close()

    if not worker_cameras:
        logging.warning(f"No cameras found for worker {worker_id}.")
        return
    
    url = worker_cameras[0].url    
    logging.info(f"Checking if file exists at URL {url}")
    if not os.path.exists(url):
        logging.error(f"File does not exist at URL {url}")
    else:
        logging.info(f"File exists at URL {url}")

    process_cameras.apply_async(queue='feed_tasks', args=[worker_id], priority=10)
    return {"status": "Feed worker initialized."}


@feed_worker_app.task
def process_cameras(worker_id: int):
    """
    Starting point to processing cameras, for manual restarts
    """

    global feed_running_flag
    start_camera_id = (worker_id - 1) * 10 + 1
    end_camera_id = start_camera_id + 9
    feed_running_flag = True

    while feed_running_flag:
        db = SessionLocal()
        worker_cameras = db.query(Camera).filter(Camera.id >= start_camera_id, Camera.id <= end_camera_id).all()
        update_cameras_for_feed_workers(worker_cameras)
        db.close()

        for _ in range(25): # run for a batch of frames per camera, then update the cameras list
            for camera in worker_cameras:
                    capture_video_frames(camera)
                    asyncio.sleep(0.001) # non-busy sleep to allow other tasks to run such as stopping
        

    release_capture_objects()
    logging.info("Feed worker stopped. Capture objects released.")

    return {"status": "Feed worker stopped."}


# main worker function
from .model_worker import process_frame
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
    # logging.info(f"Reading frame from camera {camera.id}, path {camera.url}...")
    ret, frame = cap.read()

    if not ret:
        logging.warning(f"Failed to read frame from camera {camera.id}, URL {camera.url}")
        return

    frame = preprocess_frame(frame, camera)
    process_frame.apply_async(args=[camera.id, frame.tolist()], queue='model_tasks')


def preprocess_frame(frame, camera: Camera):
    """
    Preprocess the frame (resize, crop, etc.) based on the camera's settings (e.g., resize_dims, crop_region).
    Resize dimensions are strings in format "(1280, 720)" and crop region is in format "((0,0), (1280,720))".
    """

    if camera.resize_dims:
        frame = cv2.resize(frame, eval(camera.resize_dims))

    if camera.crop_region:
        crop_region = eval(camera.crop_region)
        frame = frame[crop_region[0][1]:crop_region[1][1], crop_region[0][0]:crop_region]

    return frame


def release_capture_objects():
    """
    Release all the capture objects when done.
    """
    for camera_id, cap in capture_objects.items():
        logging.info(f"Releasing VideoCapture object for camera {camera_id}")
        cap.release()


# high priority task to update the cameras list
def update_cameras_for_feed_workers(cameras: List[Camera]):
    """
    Updates the cameras list for the feed workers.
    """
    try:
        global capture_objects

        # release the capture objects for cameras that are not in the new list
        for camera_id in capture_objects.keys():
            if camera_id not in [c.id for c in cameras]:
                logging.info(f"Releasing VideoCapture object for camera {camera_id}")
                capture_objects[camera_id].release()
                del capture_objects[camera_id]

    except Exception as e:
        logging.exception(e)


@feed_worker_app.task
def stop_feed_worker():
    """
    Task to stop the feed worker by setting the stop flag.
    """
    global stop_flag
    stop_flag = True
    time.sleep(3) # busy sleep for 3 seconds to allow other workers to stop
    logging.info("Stop signal set. Worker is stopping...")
    return {"status": "Worker is stopping..."}