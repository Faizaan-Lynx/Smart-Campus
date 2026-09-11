import os

# Import torch and bind inference threads BEFORE anything else touches torch.
# If not set right away, torch starts its default thread pools (16 threads per worker);
# multiplied across Celery's thread pool, this oversubscribes every core and pins
# the CPU at 100% even when idle.
import torch
torch.set_num_threads(1)
torch.set_num_interop_threads(1)

import ast
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
from shapely.geometry import Polygon, MultiPolygon
import threading


# celery worker for processing video feeds
full_feed_worker_app = Celery('unified_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
# remove the many h264 & rtsp warnings that get logged
os.environ['OPENCV_LOG_LEVEL'] = 'DEBUG'
os.environ['OPENCV_VIDEOIO_DEBUG'] = '1'

os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '8'

# Load the YOLO model ONCE per process at module import, and place it on the GPU explicitly.
# Once on the GPU, `model.predict(..., device=<device>)` must be told the device explicitly,
# otherwise inference can silently fall back to the CPU (causing 100% CPU usage on every worker).
MODEL_PATH = "./yolo-models/yolo26n.pt"
_DEVICE = "cuda:0" if torch.cuda.is_available() else "cpu"
model = YOLO(MODEL_PATH)
model.to(_DEVICE)
logging.info(f"full_feed_worker: YOLO model loaded on device {_DEVICE}")

# A single shared model is used by every `process_feed` loop in this process.
# Ultralytics predict is not guaranteed thread-safe, so serialize inference calls.
_model_lock = threading.Lock()


# Fire/smoke model. Loaded LAZILY on first use so workers that only run intrusion
# detection (or no model at all) never pay the memory/startup cost. Loaded and
# pinned on the GPU like the intrusion model. It keeps its OWN inference lock so
# fire detection never blocks intrusion detection and vice versa.
FIRE_SMOKE_MODEL_PATH = settings.FIRE_SMOKE_MODEL_PATH
FIRE_SMOKE_CONFIDENCE = float(getattr(settings, "FIRE_SMOKE_CONFIDENCE", 0.40))

_fire_smoke_model = None
_fire_smoke_load_lock = threading.Lock()      # guards lazy loading
_fire_smoke_predict_lock = threading.Lock()   # serializes fire inference


def get_fire_smoke_model():
    global _fire_smoke_model
    if _fire_smoke_model is None:
        with _fire_smoke_load_lock:
            if _fire_smoke_model is None:
                logging.info(f"full_feed_worker: loading fire/smoke model on device {_DEVICE}")
                _fire_smoke_model = YOLO(FIRE_SMOKE_MODEL_PATH)
                _fire_smoke_model.to(_DEVICE)
    return _fire_smoke_model


## ===== General Video Processing ===== ##

class FrameGrabber(threading.Thread):
    def __init__(self, cap_factory):
        super().__init__()
        self.cap_factory = cap_factory  # function to create a new VideoCapture
        self.cap = self.cap_factory()
        self.latest_frame = None
        self.running = True
        self.lock = threading.Lock()
        self.failed_reads = 0
        self.max_failed_reads = 30  # ~0.3s if 100fps, tune as needed

    def run(self):
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                self._reconnect()
            ret, frame = self.cap.read()
            if ret:
                with self.lock:
                    self.latest_frame = frame
                self.failed_reads = 0
            else:
                self.failed_reads += 1
                if self.failed_reads >= self.max_failed_reads:
                    self._reconnect()
                time.sleep(0.05)

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
            time.sleep(2)  # Wait before retrying

    def get_latest_frame(self):
        with self.lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()


@full_feed_worker_app.task
def process_feed(camera_id: int):
    """
    Process a single feed source: capture frames, detect intrusions, and publish annotated frames if that websocket is open.
    This function is run as a Celery task.
    Args:
        camera_id (int): The ID of the camera to process.
    """
    try:
        # get all polygons and the camera
        threshold_polygons, line_points, camera = update_polygons_and_camera(camera_id)

        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return {"error": "Camera not found"}
        
        # Initialize Redis intrusion flag
        redis_client = redis.from_url(settings.REDIS_URL)
        redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")

        # Guard against duplicate processing loops for the same camera.
        # With `--pool=threads` (high concurrency) plus the monitor/health restarts,
        # the same `process_feed` can be dispatched multiple times, each spawning its
        # own CPU-burning inference loop. Set a LOCK with NX (only-if-not-exists); if
        # another loop already owns it, exit immediately.
        lock_key = f"camera_{camera_id}_process_lock"
        if redis_client.set(lock_key, "1", nx=True) is not True:
            logging.warning(f"Camera {camera_id} already being processed by another worker. Exiting to avoid duplicates.")
            redis_client.close()
            return {"status": "Already being processed."}
        redis_client.expire(lock_key, 3600)  # safety TTL if the loop crashes

        # Mark this camera as active
        redis_client.set(f"feed_worker_{camera_id}_running", "True", ex=3600)  # TTL of 1 hour

        # Determine which detections should run on this camera. Features are independent:
        # a camera can run intrusion AND fire/smoke detection on the same feed at the same time.
        intrusion_enabled = bool(camera.detect_intrusions)
        fire_smoke_enabled = bool(camera.detect_fire_smoke)

        if not intrusion_enabled and not fire_smoke_enabled:
            logging.info(f"Camera {camera_id} has no detection features enabled. Skipping capture and processing.")
            return {"status": "No detection features enabled for this camera."}
        else:
            logging.info(f"Camera {camera_id} features -> intrusion: {intrusion_enabled}, fire/smoke: {fire_smoke_enabled}.")

        def cap_factory():
            cap = open_capture(camera.url, camera_id, max_tries=3, timeout=2)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap

        # Start frame grabber thread
        grabber = FrameGrabber(cap_factory)
        grabber.start()

        stop_check_counter = 300
        max_frame_skip_count = 0  # Track frames with no data

        # Rate-limit inference to the configured FPS. Without this the loop runs
        # `model.predict` at the raw RTSP frame rate (potentially tens of FPS),
        # keeping every core busy at ~100% even when a single camera is active.
        frame_interval = 1.0 / max(int(settings.FEED_FPS), 1)
        last_inference_time = 0.0

        logging.info(f"Using shared YOLO model on device {_DEVICE} for camera {camera_id}.")

        while True:
            frame = grabber.get_latest_frame()
            if frame is None:
                max_frame_skip_count += 1
                time.sleep(0.01)
                # If too many frames skipped, gracefully exit
                if max_frame_skip_count > 500:
                    logging.error(f"Camera {camera_id}: No frames received. Exiting gracefully.")
                    break
                continue
            
            # Reset counter on successful frame capture
            max_frame_skip_count = 0
            
            # Keep updating the TTL to indicate this task is still running
            redis_client.expire(f"feed_worker_{camera_id}_running", 3600)

            # Throttle inference to the target FPS
            now = time.time()
            if now - last_inference_time < frame_interval:
                time.sleep(0.001)
                continue
            last_inference_time = now

            annotated_frame = preprocess_frame(frame, camera)

            redis_client.get(f"camera_{camera_id}_intrusion_flag")

            intrusion_detected = False
            with _model_lock:
                results = model.predict(annotated_frame, classes=[0], verbose=False, device=_DEVICE)

            for res in results:
                for detection in res.boxes:
                    if detection.conf < 0.57:
                        continue
                    # Get class index and label
                    class_idx = int(detection.cls[0]) if hasattr(detection, 'cls') else None
                    # If your model has a .names attribute, use it to get the label
                    class_label = model.names[class_idx] if hasattr(model, 'names') and class_idx is not None else str(class_idx)
                    # Only process if class is 'person' (COCO: class 0)
                    if class_idx != 0:
                        continue
                    x1, y1, x2, y2 = map(int, detection.xyxy[0])
                    bbox = detection.xyxy[0]

                    # if intrusion is detected, raise flag and draw red box, put text
                    if centroid_near_line(bbox, threshold_polygons, camera.detection_threshold) or box_intersects_line(bbox, threshold_polygons):
                        intrusion_detected = True
                        annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)  # Red box for intrusion
                    else:
                        annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)  # Green box for no intrusion

            if settings.SHOW_INTRUSION_LINES == "True":
                annotated_frame = cv2.polylines(annotated_frame, line_points, True, (0,0,255), 1)
            
            redis_intrusion_flag = redis_client.get(f"camera_{camera_id}_intrusion_flag")
            intrusion_time_key = f"camera_{camera_id}_intrusion_time"
            last_intrusion_time = redis_client.get(intrusion_time_key)
            if last_intrusion_time:
                last_intrusion_time = float(last_intrusion_time)
            else:
                last_intrusion_time = 0
            current_time = time.time()
            ALERT_DURATION = 2  # seconds
            # Add cooldown logic
            COOLDOWN = 5  # seconds between alerts
            alert_time_key = f"camera_{camera_id}_last_alert_time"
            last_alert_time = redis_client.get(alert_time_key)
            if last_alert_time:
                last_alert_time = float(last_alert_time)
            else:
                last_alert_time = 0

            if settings.SHOW_INTRUSION_FLAG == "True" and redis_intrusion_flag == b"True" and (current_time - last_intrusion_time) < ALERT_DURATION:
                annotated_frame = cv2.putText(annotated_frame, "Intrusion Detected", (10, 30), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)
            elif redis_intrusion_flag == b"True" and (current_time - last_intrusion_time) >= ALERT_DURATION:
                redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")

            # Publish the latest frame regardless of detection
            if redis_client.get(f"camera_{camera_id}_websocket_active") == b"True":
                publish_frame(camera_id, annotated_frame)

            # handle intrusion event if detected, always allow new alerts but with cooldown
            if intrusion_detected:
                if (current_time - last_alert_time) > COOLDOWN:
                    handle_intrusion_event(camera_id, annotated_frame)
                    redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
                    redis_client.set(intrusion_time_key, str(current_time))
                    redis_client.set(alert_time_key, str(current_time))

            # ---- Fire / smoke detection (fully independent of intrusion) ----
            # Runs on the same grabbed frame and shares the same publish loop, so the
            # live feed is never disturbed. It has its OWN cooldown key so a fire alert
            # never suppresses an intrusion alert (or vice versa).
            if fire_smoke_enabled:
                fire_smoke_model = get_fire_smoke_model()
                with _fire_smoke_predict_lock:
                    fire_results = fire_smoke_model.predict(
                        annotated_frame, conf=FIRE_SMOKE_CONFIDENCE, verbose=False, device=_DEVICE
                    )

                fire_smoke_detected = False
                detected_label = None
                detected_confidence = 0.0
                for res in fire_results:
                    for detection in res.boxes:
                        try:
                            label_idx = int(detection.cls[0])
                            label = str(fire_smoke_model.names[label_idx] if hasattr(fire_smoke_model, "names") and label_idx in fire_smoke_model.names else label_idx).strip().lower()
                        except Exception:
                            continue
                        if "fire" not in label and "smoke" not in label:
                            continue
                        conf = float(detection.conf[0])
                        x1, y1, x2, y2 = map(int, detection.xyxy[0])
                        color = (0, 0, 255) if "fire" in label else (210, 180, 140)
                        annotated_frame = cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), color, 2)
                        annotated_frame = cv2.putText(annotated_frame, label.upper(), (x1, max(20, y1 - 8)), cv2.FONT_HERSHEY_SIMPLEX, 0.7, color, 2)
                        if conf > detected_confidence:
                            detected_confidence = conf
                            detected_label = "fire" if "fire" in label else "smoke"
                        fire_smoke_detected = True

                if fire_smoke_detected:
                    fire_alert_time_key = f"camera_{camera_id}_last_fire_smoke_alert_time"
                    last_fire_alert_time = float(redis_client.get(fire_alert_time_key) or 0)
                    if (current_time - last_fire_alert_time) > COOLDOWN:
                        handle_fire_smoke_event(camera_id, annotated_frame, alert_type=detected_label or "fire_smoke")
                        redis_client.set(fire_alert_time_key, str(current_time))

            stop_check_counter -= 1
            if stop_check_counter <= 0:
                stop_check_counter = 300
                camera_running = redis_client.get(f"feed_worker_{camera_id}_running")
                global_cameras_running = redis_client.get("feed_workers_running")

                threshold_polygons, line_points, camera = update_polygons_and_camera(camera_id)
                if threshold_polygons is None and line_points is None:
                    break

                if threshold_polygons is None:
                    logging.error(f"Failed to get polygons for camera {camera_id}.")
                    break

                # Refresh enabled features so toggling fire/smoke (or intrusion) in the UI
                # takes effect on the running loop without restarting the worker.
                intrusion_enabled = bool(camera.detect_intrusions)
                fire_smoke_enabled = bool(camera.detect_fire_smoke)

                if camera_running == b"False" or global_cameras_running == b"False":
                    logging.info(f"Stopping feed processing for camera {camera_id}.")
                    break
                
        grabber.stop()
        grabber.join()

    except Exception as e:
        logging.exception(f"Error processing feed for camera {camera_id}: {e}")
    finally:
        try:
            redis_client.set(f"feed_worker_{camera_id}_running", "False")
            redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")
            redis_client.delete(f"camera_{camera_id}_process_lock")
        except Exception:
            pass
        redis_client.close()
        logging.info(f"Stopped feed processing for camera {camera_id}")

    return {"status": "Feed processing stopped."}

def update_polygons_and_camera(camera_id: int):
    """
    Get the polygons for a specific camera.

    Args:
        camera_id (int) : The id number of the camera needed

    Returns:
        Polygons (shapely.geometry.MultiPolygon) : The Polygons which are needed to detect intrusions
        line_points (list[numpy.array]) : The points of the polygons as needed by cv2.polylines() function
        camera (Camera) : The updated camera info
    """
    with SessionLocal() as db:
        camera = db.query(Camera).filter(Camera.id == camera_id).first()

    if not camera:
        logging.error(f"Camera {camera_id} not found.")
        return (None, None, None)
    
    try:
        temp = ast.literal_eval(camera.lines)
        polygons = MultiPolygon([Polygon(poly) for poly in temp])
        line_points = [ np.array(polygon.exterior.coords, dtype=np.int32).reshape((-1, 1, 2)) for polygon in polygons.geoms ]
        return polygons, line_points, camera
    except Exception as e:
        logging.error(f"Error creating polygon/line threshold for camera {camera_id}: {e}")
        return (MultiPolygon(), [], camera)


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
        
        # Only open capture and process frames if detect_intrusions is True
        if not camera.detect_intrusions:
            logging.info(f"Camera {camera_id} detect_intrusions is False. Skipping capture and processing.")
            return {"status": "Intrusion detection disabled for this camera."}

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

            if redis_client.get(f"camera_{camera_id}_websocket_active") == b"True":
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

# redis client for storing frames
redis_client_ws = redis.from_url(settings.REDIS_URL)

def publish_frame(camera_id: int, annotated_frame: np.ndarray):
    """
    Store the latest annotated frame in Redis as a simple key-value (not pub/sub).
    This prevents buffer overflow by only keeping the latest frame, not queuing all frames.
    Clients will poll for the latest frame instead of subscribing to a stream.
    """
    global redis_client_ws
    
    try:
        # Check if WebSocket is active before publishing
        if redis_client_ws.get(f"camera_{camera_id}_websocket_active") != b"True":
            return
        
        _, buffer = cv2.imencode(".jpg", annotated_frame)
        
        # Try to store with current client
        try:
            # Store frame with 2-second expiry to clean up automatically
            # Use a key-value store instead of pub/sub to keep only the latest frame
            redis_client_ws.setex(
                f"camera_{camera_id}_frame_latest",
                2,  # expiry in seconds
                buffer.tobytes()
            )
        except (redis.ConnectionError, redis.TimeoutError):
            # Reconnect if connection lost
            redis_client_ws = redis.from_url(settings.REDIS_URL)
            redis_client_ws.setex(
                f"camera_{camera_id}_frame_latest",
                2,
                buffer.tobytes()
            )
        
        # logging.info(f"Published frame for camera {camera_id}")
    except Exception as e:
        logging.warning(f"Failed to publish frame for camera {camera_id}: {e}")


def open_capture(url:str, camera_id:int, max_tries:int=10, timeout:int=6):
    """
    Reopen video capture object if failed, using best-practice low-latency settings for RTSP.
    Applies hardware-accelerated decoding if available (Intel/NVIDIA),
    and sets GStreamer latency to 50ms for smoother playback.
    """
    # Try to auto-detect hardware decoder preference from environment or config
    hw_decoder = os.environ.get("GST_HW_DECODER", "auto")  # 'intel', 'nvidia', or 'auto'
    for attempt in range(0, max_tries):
        cap = None
        if url.startswith("rtsp://"):
            # Build GStreamer pipeline with hardware decoding if possible
            gst_decoders = []
            if hw_decoder == "intel":
                gst_decoders = ["vaapidecode"]
            elif hw_decoder == "nvidia":
                gst_decoders = ["nvv4l2decoder"]
            elif hw_decoder == "auto":
                # Try NVIDIA first, then Intel, then software
                gst_decoders = ["nvv4l2decoder", "vaapidecode"]
            gst_decoders.append("avdec_h264")  # Always fallback to software

            for decoder in gst_decoders:
                gst_str = (
                    f'rtspsrc location={url} latency=50 ! '
                    'rtph264depay ! h264parse ! '
                    f'{decoder} ! videoconvert ! '
                    'appsink drop=1 max-buffers=1 sync=false'
                )
                cap = cv2.VideoCapture(gst_str, cv2.CAP_GSTREAMER)
                if cap.isOpened():
                    logging.info(f"[GStreamer:{decoder}] Video Capture object for Camera {camera_id} successfully created.")
                    return cap
                else:
                    cap.release()
            # Fallback to FFMPEG with TCP transport
            cap = cv2.VideoCapture(f"{url}?rtsp_transport=tcp", cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            if cap.isOpened():
                logging.info(f"[FFMPEG] Video Capture object for Camera {camera_id} successfully created with TCP transport.")
                return cap
            else:
                cap.release()
        else:
            cap = cv2.VideoCapture(url)
            if cap.isOpened():
                logging.info(f"Video Capture object for Camera {camera_id} successfully created.")
                return cap
            else:
                cap.release()
        logging.error(f"Attempt {attempt} of starting capture for Camera {camera_id} failed.")
        time.sleep(timeout)
    logging.error(f"Failed to create Capture object for Camera {camera_id}")
    raise Exception(f"Failed to create Capture object for Camera {camera_id}")


## ====== Handling Intrusion Logic ===== ##

@full_feed_worker_app.task
def set_intrusion_flag(camera_id: int):
    """
    Unset the intrusion flag for a camera.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
    redis_client.close()
    logging.info(f"Set intrusion flag for camera {camera_id}")
    full_feed_worker_app.send_task('core.celery.full_feed_worker.unset_intrusion_flag', args=[camera_id], queue="feed_tasks", countdown=5)



@full_feed_worker_app.task
def unset_intrusion_flag(camera_id: int):
    """
    Unset the intrusion flag for a camera.
    """
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_intrusion_flag", "False")
    redis_client.close()
    logging.info(f"Unset intrusion flag for camera {camera_id}")


def handle_intrusion_event(camera_id: int, frame: np.ndarray = None):
    """
    Handle an intrusion event: create an alert and set a timer to reset the intrusion flag.
    Save the frame where the initial intrusion was detected to later display in alert.
    """
    logging.warning(f"Intrusion detected for camera {camera_id}!!!")

    file_path = None

    if frame is not None:
        # Save the frame to a file
        timestamp = int(datetime.now().timestamp())
        file_path = f"/app/alert_images/intrusion_{camera_id}_{timestamp}.jpg"
        cv2.imwrite(file_path, frame)


    alert_data = AlertBase(camera_id=camera_id, timestamp=str(datetime.now().replace(microsecond=0)), 
                           is_acknowledged=False, file_path=file_path)
    db = SessionLocal()
    create_alert(alert_data, db)
    db.close()

    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_intrusion_flag", "True")
    redis_client.close()
    full_feed_worker_app.send_task('core.celery.full_feed_worker.unset_intrusion_flag', args=[camera_id], queue="feed_tasks", countdown=settings.INTRUSION_FLAG_DURATION)


def handle_fire_smoke_event(camera_id: int, frame: np.ndarray = None, alert_type: str = "fire_smoke"):
    """
    Handle a fire/smoke detection event: save the annotated frame and create an alert.
    Uses its own `alert_type` (e.g. "fire", "smoke") so it never collides with intrusion alerts.
    """
    logging.warning(f"{alert_type.upper()} detected for camera {camera_id}!!!")

    file_path = None
    if frame is not None:
        timestamp = int(datetime.now().timestamp())
        file_path = f"/app/alert_images/{alert_type}_{camera_id}_{timestamp}.jpg"
        try:
            cv2.imwrite(file_path, frame)
        except Exception:
            file_path = None

    alert_data = AlertBase(
        camera_id=camera_id,
        timestamp=str(datetime.now().replace(microsecond=0)),
        is_acknowledged=False,
        file_path=file_path,
        alert_type=alert_type,
    )
    db = SessionLocal()
    try:
        create_alert(alert_data, db)
    finally:
        db.close()


def centroid_near_line(bounding_box: tuple, region:MultiPolygon, threshold:float=5) -> bool:
    """
    Determine if a centroid is near or has crossed a region.
    """
    x1, y1, x2, y2 = bounding_box
    box_polygon = Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])
    return region.distance(box_polygon.centroid) <= threshold


def box_intersects_line(bounding_box: tuple, region:MultiPolygon) -> bool:
    """
    Determines if a bounding box intersects with a threshold region.
    """
    x1, y1, x2, y2 = bounding_box
    box_polygon = Polygon([(x1, y1), (x2, y1), (x2, y2), (x1, y2)])
    return box_polygon.intersects(region)



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

    if camera.detect_intrusions or camera.detect_fire_smoke:
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

    os.makedirs("/app/alert_images", exist_ok=True)

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


@full_feed_worker_app.task
def monitor_feed_health():
    """
    Monitor health of all camera feeds and restart any that have failed.
    This task should run periodically (e.g., every 30 seconds).
    """
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        db = SessionLocal()
        cameras = db.query(Camera).all()
        db.close()
        
        if not cameras:
            logging.warning("No cameras found in database for health check.")
            redis_client.close()
            return "No cameras to monitor"
        
        restarted_cameras = []
        for camera in cameras:
            running_flag = redis_client.get(f"feed_worker_{camera.id}_running")
            global_running = redis_client.get("feed_workers_running")
            
            # If global running is True but individual camera is False, restart it
            if global_running == b"True" and running_flag != b"True":
                logging.warning(f"Camera {camera.id} feed not running. Restarting...")
                start_feed_worker.apply_async(queue='feed_tasks', args=[camera.id], priority=9)
                restarted_cameras.append(camera.id)
        
        redis_client.close()
        
        if restarted_cameras:
            logging.info(f"Restarted feeds for cameras: {restarted_cameras}")
            return {"status": "Some feeds were restarted", "cameras": restarted_cameras}
        else:
            logging.debug("All camera feeds are healthy.")
            return {"status": "All feeds are healthy", "cameras": []}
    
    except Exception as e:
        logging.exception(f"Error in monitor_feed_health: {e}")
        return {"error": str(e)}