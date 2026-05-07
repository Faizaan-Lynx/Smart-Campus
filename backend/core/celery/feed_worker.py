import os
import cv2
import redis
import logging
import numpy as np
from typing import List
from config import settings
from models.cameras import Camera
from sqlalchemy.orm import Session
from core.database import SessionLocal
from celery import Celery, signals, group
import time
import random
import subprocess
import gi
import threading
from queue import Queue

# Initialize GStreamer
gi.require_version('Gst', '1.0')
from gi.repository import Gst

Gst.init(None)

# Ensure logging is configured to show INFO logs to console
logging.basicConfig(level=logging.INFO, format='%(asctime)s %(levelname)s %(message)s')

feed_worker_app = Celery('feed_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
feed_worker_app.conf.update(
    broker_transport_options={'visibility_timeout': 3600},
    worker_heartbeat=60,
)

worker_id = None
capture_objects = {}
gstreamer_pipelines = {}  # Stores GStreamer pipeline objects per camera


class GStreamerRTSPSource:
    """
    Low-latency RTSP source using GStreamer.
    Provides frame extraction with minimal buffering.
    """
    def __init__(self, camera_id: int, rtsp_url: str):
        self.camera_id = camera_id
        self.rtsp_url = rtsp_url
        self.frame_queue = Queue(maxsize=2)  # Keep only latest frames
        self.pipeline = None
        self.bus = None
        self.thread = None
        self.running = False
        self._initialize_pipeline()

    def _initialize_pipeline(self):
        """Initialize GStreamer pipeline for low-latency RTSP streaming."""
        try:
            # GStreamer pipeline optimized for zero-latency
            # Using rtspsrc with low-latency, queue with leaky=downstream to drop old frames
            pipeline_str = f"""
            rtspsrc location={self.rtsp_url} 
                   protocols=tcp 
                   latency=0 
                   ntp-time-source=running-time 
                   buffer-mode=0
            ! rtph264depay 
            ! h264parse 
            ! avdec_h264 output-corrupt=false 
            ! videoscale 
            ! video/x-raw,format=BGR 
            ! videoconvert 
            ! appsink name=sink caps="video/x-raw,format=BGR" 
                     max-buffers=1 
                     drop=true 
                     sync=false
            """
            
            self.pipeline = Gst.parse_launch(pipeline_str)
            self.bus = self.pipeline.get_bus()
            self.bus.add_signal_watch()
            self.bus.connect("message", self._on_bus_message)
            
            self.appsink = self.pipeline.get_by_name("sink")
            self.appsink.connect("new-sample", self._on_new_sample)
            
            logging.info(f"GStreamer pipeline initialized for Camera {self.camera_id}")
        except Exception as e:
            logging.error(f"Failed to initialize GStreamer pipeline for Camera {self.camera_id}: {e}")
            raise

    def _on_new_sample(self, appsink):
        """Callback when new sample is available."""
        try:
            sample = appsink.emit("pull-sample")
            if sample:
                buf = sample.get_buffer()
                caps = sample.get_caps()
                
                # Get frame data
                result, mapinfo = buf.map(Gst.MapFlags.READ)
                if result:
                    # Get frame dimensions from caps
                    struct = caps.get_structure(0)
                    width = struct.get_int("width")[1]
                    height = struct.get_int("height")[1]
                    
                    # Convert buffer to numpy array
                    data = bytes(mapinfo.data)
                    frame = np.frombuffer(data, dtype=np.uint8).reshape((height, width, 3))
                    
                    # Put frame in queue (replace old frame if queue is full)
                    try:
                        self.frame_queue.put_nowait(frame.copy())
                    except:
                        try:
                            self.frame_queue.get_nowait()  # Remove old frame
                            self.frame_queue.put_nowait(frame.copy())
                        except:
                            pass
                    
                    buf.unmap(mapinfo)
            return True
        except Exception as e:
            logging.error(f"Error processing sample for Camera {self.camera_id}: {e}")
            return False

    def _on_bus_message(self, bus, message):
        """Handle GStreamer bus messages."""
        message_type = message.type
        if message_type == Gst.MessageType.ERROR:
            err, debug = message.parse_error()
            logging.error(f"GStreamer error for Camera {self.camera_id}: {err.message}")
        elif message_type == Gst.MessageType.WARNING:
            warn, debug = message.parse_warning()
            logging.warning(f"GStreamer warning for Camera {self.camera_id}: {warn.message}")

    def start(self):
        """Start the GStreamer pipeline."""
        try:
            self.running = True
            self.pipeline.set_state(Gst.State.PLAYING)
            logging.info(f"Started GStreamer pipeline for Camera {self.camera_id}")
        except Exception as e:
            logging.error(f"Failed to start GStreamer pipeline for Camera {self.camera_id}: {e}")
            self.running = False
            raise

    def get_frame(self, timeout=1.0):
        """Get latest frame from the queue."""
        try:
            frame = self.frame_queue.get(timeout=timeout)
            return frame
        except:
            return None

    def stop(self):
        """Stop the GStreamer pipeline."""
        try:
            self.running = False
            if self.pipeline:
                self.pipeline.set_state(Gst.State.NULL)
            logging.info(f"Stopped GStreamer pipeline for Camera {self.camera_id}")
        except Exception as e:
            logging.error(f"Failed to stop GStreamer pipeline for Camera {self.camera_id}: {e}")


@signals.worker_ready.connect # automatically trigger task on worker startup
def on_feed_worker_startup(**kwargs):
    """
    Initialize the feed workers on Celery feed_worker startup.
    """

    # assume that default point of entry for this task is worker startup
    try:
        worker_name = kwargs['sender'].hostname.split('@')[1]
    except Exception as e:
        worker_name = on_feed_worker_startup.request.hostname.split('@')[1]

    # worker name will be celery@feed_worker(num)
    global celery_worker_id
    celery_worker_id = int(worker_name.split('feed_worker')[-1])

    start_camera_id = (celery_worker_id - 1) * 10 + 1
    end_camera_id = start_camera_id + 9
    
    logging.info(f"Feed Worker {celery_worker_id} will process cameras {start_camera_id}-{end_camera_id}")

    db : Session = SessionLocal()    
    worker_cameras = db.query(Camera).filter(Camera.id >= start_camera_id, Camera.id <= end_camera_id).all()
    db.close()

    if not worker_cameras:
        logging.warning(f"No cameras found for worker {celery_worker_id}.")
        return
    
    redis_client = redis.from_url(settings.REDIS_URL)
    for camera in worker_cameras:
        redis_client.set(f"camera_{camera.id}_intrusion_flag", "False") 

    # if celery_worker_id == 1:
    #     time.sleep(5) # wait for all workers to start before starting the processing of every worker
    #     start_all_feed_workers.apply_async(queue='feed_tasks', priority=5)

    return {"status": "Feed worker initialized."}


# main task - processes every camera assigned to this worker
@feed_worker_app.task
def process_cameras(worker_id: int):
    """
    Starting point to processing cameras, for manual restarts
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    global_stop_flag = redis_client.get("feed_workers_running")
    individual_stop_flag = redis_client.get(f"feed_worker_{worker_id}_running")
    redis_client.close()

    start_camera_id = (worker_id - 1) * 10 + 1
    end_camera_id = start_camera_id + 9

    while global_stop_flag == b"True" and individual_stop_flag == b"True":
        db = SessionLocal()
        worker_cameras = db.query(Camera).filter(Camera.id >= start_camera_id, Camera.id <= end_camera_id).all()
        update_cameras_for_feed_workers(worker_cameras)
        db.close()

        for _ in range(10): # run for a batch of frames per camera, then update the cameras list
            for camera in worker_cameras:
                    capture_video_frames(camera)

        redis_client = redis.from_url(settings.REDIS_URL)
        global_stop_flag = redis_client.get("feed_workers_running")
        individual_stop_flag = redis_client.get(f"feed_worker_{worker_id}_running")
        redis_client.close()

    release_capture_objects()
    logging.info("Feed worker stopped. Capture objects released.")

    return {"status": "Feed worker stopped."}


# captures a single frame and sends it to model worker
from .model_worker import process_frame

def capture_video_frames(camera: Camera):
    """
    Capture frames using GStreamer with zero-latency configuration.
    GStreamer ensures minimal buffering and provides real-time frame delivery.
    """
    attempt = 0
    retry_delay = 2  # seconds
    max_retries = 5
    
    # Initialize or retrieve GStreamer source
    if camera.id not in gstreamer_pipelines or gstreamer_pipelines[camera.id] is None:
        try:
            gstream_source = GStreamerRTSPSource(camera.id, camera.url)
            gstream_source.start()
            gstreamer_pipelines[camera.id] = gstream_source
            time.sleep(1)  # Give pipeline time to start
        except Exception as e:
            logging.error(f"Failed to initialize GStreamer source for Camera {camera.id}: {e}")
            return
    
    gstream_source = gstreamer_pipelines[camera.id]
    
    # Try to get frame
    while attempt < max_retries:
        try:
            frame = gstream_source.get_frame(timeout=5.0)
            if frame is not None:
                frame = cv2.convertScaleAbs(frame)
                frame = preprocess_frame(frame, camera)
                process_frame.apply_async(args=[camera.id, frame.tolist()], queue='model_tasks')
                return
            else:
                attempt += 1
                logging.warning(f"No frame received from Camera {camera.id} (attempt {attempt}/{max_retries})")
                time.sleep(retry_delay)
        except Exception as e:
            attempt += 1
            logging.error(f"Error capturing frame from Camera {camera.id}: {e} (attempt {attempt}/{max_retries})")
            time.sleep(retry_delay)
    
    # If all retries failed, log error and mark camera as unavailable
    logging.error(f"Camera {camera.id} is unavailable after {max_retries} attempts. URL: {camera.url}")
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.set(f"camera_{camera.id}_unavailable", "True")
        redis_client.close()
    except Exception as e:
        logging.error(f"Failed to set unavailable flag in Redis for camera {camera.id}: {e}")


def preprocess_frame(frame, camera: Camera):
    """
    Preprocess the frame (resize, crop, etc.) based on the camera's settings (e.g., resize_dims, crop_region).
    Resize dimensions are strings in format "(1280, 720)" and crop region is in format "((0,0), (1280,720))".
    Crop before resize.
    """

    if camera.crop_region:
        crop_region = eval(camera.crop_region)
        frame = frame[crop_region[0][1]:crop_region[1][1], crop_region[0][0]:crop_region]
    
    if camera.resize_dims:
        resize_dims = eval(camera.resize_dims) # default is "(640,480)"
        frame = cv2.resize(frame, resize_dims) # resize to 640x480

    return frame


# high priority task to update the cameras list
def update_cameras_for_feed_workers(cameras: List[Camera]):
    """
    Updates the cameras list for the feed workers.
    Releases capture objects for cameras not in the new list.
    """
    try:
        global capture_objects
        current_ids = set(capture_objects.keys())
        new_ids = set(c.id for c in cameras)
        for camera_id in current_ids - new_ids:
            try:
                logging.info(f"Releasing VideoCapture object for camera {camera_id}")
                capture_objects[camera_id].release()
            except Exception:
                pass
            capture_objects.pop(camera_id, None)
    except Exception as e:
        logging.exception(e)

# ========== feed worker starting tasks ========== #

@feed_worker_app.task
def start_all_feed_workers():
    """
    Task to start the ALL feed workers simultaneously.
    """
    logging.info("Starting all feed workers...")

    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("feed_workers_running", "True")
    redis_client.close()

    start_jobs_group = group(start_feed_worker.s(i+1) for i in range(settings.FEED_WORKERS))
    start_jobs_group.apply_async(queue='feed_tasks', priority=10)

    logging.info("All feed workers started!")
    return {"status": "Feed workers started."}

@feed_worker_app.task
def start_feed_worker(worker_id: int):
    """
    Start a single feed worker by setting its individual running flag.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"feed_worker_{worker_id}_running", "True")
    redis_client.close()

    process_cameras.apply_async(queue='feed_tasks', args=[worker_id], priority=10)

    logging.info(f"Feed worker {worker_id} started!")
    return {"status": f"Feed worker {worker_id} started."}


# ========== feed worker stopping tasks ========== #

@feed_worker_app.task
def stop_all_feed_workers():
    """
    Task to stop the ALL feed workers simultaneously.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("feed_workers_running", "False")
    redis_client.close()

    logging.info("All feed workers stopped!")
    return {"status": "Feed workers stopped."}


@feed_worker_app.task
def stop_feed_worker(worker_id: int):
    """
    Task to stop a single feed worker by setting its individual stop flag.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"feed_worker_{worker_id}_running", "False")
    redis_client.close()

    logging.info(f"Feed worker {worker_id} stopped!")
    return {"status": f"Feed worker {worker_id} stopped."}


def release_capture_objects():
    """
    Release all the capture objects and GStreamer pipelines when done.
    """
    for camera_id, cap in capture_objects.items():
        logging.info(f"Releasing VideoCapture object for camera {camera_id}")
        try:
            cap.release()
        except Exception as e:
            logging.error(f"Error releasing VideoCapture for camera {camera_id}: {e}")
    
    for camera_id, gstream_source in gstreamer_pipelines.items():
        logging.info(f"Stopping GStreamer pipeline for camera {camera_id}")
        try:
            gstream_source.stop()
        except Exception as e:
            logging.error(f"Error stopping GStreamer pipeline for camera {camera_id}: {e}")
