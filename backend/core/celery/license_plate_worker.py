"""
license_plate_worker.py
-----------------------
Celery worker for license plate detection using fast-alpr.
Intrusion detection code is untouched – this worker only runs when
camera.detect_intrusions is False (enforced in process_feed).
"""

import os
import cv2
import json
import time
import redis
import logging
import threading
import numpy as np
import re
import torch
from config import settings
from ultralytics import YOLO
from datetime import datetime
from celery import Celery, group
from models.cameras import Camera
from models.license_detection import License
from sqlalchemy.orm import Session
from core.database import SessionLocal
from models.users import Users
from fast_alpr import ALPR

# ──────────────────────────────────────────────────────────────────────────────
# Celery app
# ──────────────────────────────────────────────────────────────────────────────
license_plate_worker_app = Celery(
    'license_plate_worker',
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL,
)

os.environ['OPENCV_LOG_LEVEL'] = 'ERROR'
os.environ['OPENCV_FFMPEG_LOGLEVEL'] = '8'

# ──────────────────────────────────────────────────────────────────────────────
# Global model initialisation (loaded once per worker process)
# ──────────────────────────────────────────────────────────────────────────────
device = 'cuda' if torch.cuda.is_available() else 'cpu'

# fast-alpr  ← replaces the old PaddleOCR + manual YOLO pipeline
alpr = ALPR(
    detector_model="yolo-v9-t-384-license-plate-end2end",
    ocr_model="cct-xs-v2-global-model",
)
logging.info("fast-alpr ALPR engine loaded.")

# Face detection model (unchanged – do not touch intrusion code)
face_model = YOLO("./yolo-models/yolo26n.pt")
face_model.to(device)
logging.info(f"Face detection model loaded on device: {device}")

# Storage directory for plate images
PLATE_IMAGE_DIR = "/app/assets/licence_plates"
os.makedirs(PLATE_IMAGE_DIR, exist_ok=True)


# ──────────────────────────────────────────────────────────────────────────────
# OCR post-processing helpers (keep Pakistan plate rules)
# ──────────────────────────────────────────────────────────────────────────────
def apply_lp_ocr_rules(license_plate: str, class_name: str = "car") -> tuple[bool, str]:
    """
    Applies regional cleanup rules to raw OCR text.
    Returns (is_valid, cleaned_text).
    """
    text = license_plate.replace(' ', '').upper()
    banned_keywords = [
        'ICTISLAMABAD', 'ICT-', 'PUNJAB', 'SINDH',
        'KPK', 'BALOCHISTAN', 'AJK', 'GILGIT', 'ISLAMABAD',
    ]
    for keyword in banned_keywords:
        if text.startswith(keyword):
            text = text[len(keyword):]
            break
    text = text.lstrip('-')

    pattern = r'^[A-Z0-9\-]{5,10}$'
    if re.match(pattern, text):
        logging.info(f"Plate matched pattern for class '{class_name}': {text}")
        return True, text
    logging.info(f"Plate did not match pattern for class '{class_name}': {text}")
    return False, text


def normalize_plate(plate: str) -> str:
    """
    Normalizes a Pakistani-format plate down to just its numeric portion.

    Pakistani plates are typically <letters>-<digits>, e.g. 'L-2893',
    'LEA-2893', 'ABC-1234'. Per requirement, only the numeric part is
    stored in the database (e.g. 'L-2893' -> '2893').

    Falls back to the cleaned alphanumeric string if no digits are found,
    so unusual/non-standard plates still get stored rather than dropped.
    """
    cleaned = plate.replace(" ", "").upper()
    digits_only = re.sub(r"[^0-9]", "", cleaned)
    if digits_only:
        return digits_only
    # No digits at all — fall back to stripped alphanumeric (shouldn't
    # normally happen for a real plate, but avoids silently losing data).
    return re.sub(r"[^A-Z0-9]", "", cleaned)


# ──────────────────────────────────────────────────────────────────────────────
# Face detection  (UNTOUCHED – intrusion detection remains separate)
# ──────────────────────────────────────────────────────────────────────────────
def detect_faces_in_frame(frame: np.ndarray) -> list:
    """
    Detect faces in the given frame using YOLOv8 face detection model.
    Returns a list of dicts with keys: bbox, confidence.
    This function is shared with the intrusion system – do NOT modify its logic.
    """
    try:
        results = face_model(frame, device=device, verbose=False)[0]
        faces = []
        for box in results.boxes:
            x1, y1, x2, y2 = map(int, box.xyxy[0])
            conf = float(box.conf[0])
            if conf > 0.5:
                faces.append({'bbox': (x1, y1, x2, y2), 'confidence': conf})
        logging.info(f"Detected {len(faces)} faces in frame")
        return faces
    except Exception as e:
        logging.error(f"Error in face detection: {e}")
        return []


# ──────────────────────────────────────────────────────────────────────────────
# GStreamer-first capture helper (hardware-decoder aware, matches
# full_feed_worker.py so LP and intrusion feeds behave identically)
# ──────────────────────────────────────────────────────────────────────────────
def open_capture(url: str, camera_id: int, max_tries: int = 10, timeout: int = 6):
    """
    Opens VideoCapture, preferring GStreamer for RTSP streams with hardware
    decoding when available (NVIDIA/Intel), falling back to software decode,
    then to FFMPEG TCP. Mirrors full_feed_worker.open_capture for parity.
    """
    hw_decoder = os.environ.get("GST_HW_DECODER", "auto")  # 'intel', 'nvidia', or 'auto'

    for attempt in range(max_tries):
        cap = None
        if url.startswith("rtsp://"):
            gst_decoders = []
            if hw_decoder == "intel":
                gst_decoders = ["vaapidecode"]
            elif hw_decoder == "nvidia":
                gst_decoders = ["nvv4l2decoder"]
            elif hw_decoder == "auto":
                gst_decoders = ["nvv4l2decoder", "vaapidecode"]
            gst_decoders.append("avdec_h264")  # always fall back to software

            for decoder in gst_decoders:
                gst_str = (
                    f"rtspsrc location={url} latency=50 ! "
                    "rtph264depay ! h264parse ! "
                    f"{decoder} ! videoconvert ! "
                    "appsink drop=1 max-buffers=1 sync=false"
                )
                cap = cv2.VideoCapture(gst_str, cv2.CAP_GSTREAMER)
                if cap.isOpened():
                    logging.info(f"[GStreamer:{decoder}] Camera {camera_id}: stream opened.")
                    return cap
                cap.release()

            # ── FFMPEG TCP fallback ─────────────────────────────────────────
            cap = cv2.VideoCapture(f"{url}?rtsp_transport=tcp", cv2.CAP_FFMPEG)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            cap.set(cv2.CAP_PROP_OPEN_TIMEOUT_MSEC, 8000)
            cap.set(cv2.CAP_PROP_READ_TIMEOUT_MSEC, 8000)
            if cap.isOpened():
                logging.info(f"[FFMPEG-TCP] Camera {camera_id}: stream opened.")
                return cap
            cap.release()
        else:
            cap = cv2.VideoCapture(url)
            if cap.isOpened():
                logging.info(f"[FILE/HTTP] Camera {camera_id}: capture opened.")
                return cap
            cap.release()

        logging.error(f"Capture attempt {attempt + 1}/{max_tries} failed for camera {camera_id}.")
        time.sleep(timeout)

    raise RuntimeError(f"Failed to open capture for camera {camera_id} after {max_tries} attempts.")


class FrameGrabber(threading.Thread):
    """
    Continuously reads frames from the camera on a dedicated background
    thread, decoupled from inference. This is the same pattern used by
    full_feed_worker.py for the intrusion feed — it's what makes that feed
    feel smooth: capture rate is never bottlenecked by how long YOLO/OCR
    takes to process each frame. The main loop just grabs whatever the
    latest available frame is, instead of blocking on cap.read() + inference
    in series every iteration.
    """

    def __init__(self, cap_factory, camera_id: int):
        super().__init__()
        self.cap_factory = cap_factory
        self.camera_id = camera_id
        self.cap = self.cap_factory()
        self.latest_frame = None
        self.running = True
        self.lock = threading.Lock()
        self.failed_reads = 0
        self.max_failed_reads = 30
        self.daemon = True

    def run(self):
        while self.running:
            if self.cap is None or not self.cap.isOpened():
                self._reconnect()
            try:
                ret, frame = self.cap.read()
            except Exception as e:
                logging.error(f"[Camera {self.camera_id}] Exception in FrameGrabber.read(): {e}")
                ret, frame = False, None

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
            time.sleep(2)

    def get_latest_frame(self):
        with self.lock:
            return self.latest_frame.copy() if self.latest_frame is not None else None

    def stop(self):
        self.running = False
        if self.cap:
            self.cap.release()


# ──────────────────────────────────────────────────────────────────────────────
# Frame utilities
# ──────────────────────────────────────────────────────────────────────────────
def preprocess_frame(frame: np.ndarray, camera: Camera) -> np.ndarray:
    if camera.crop_region:
        crop_region = eval(camera.crop_region)
        frame = frame[
            crop_region[0][1]:crop_region[1][1],
            crop_region[0][0]:crop_region[1][0],
        ]
    if camera.resize_dims:
        resize_dims = eval(camera.resize_dims)
        frame = cv2.resize(frame, resize_dims)
    return frame


def preprocess_frame_for_lp(frame: np.ndarray, camera: Camera) -> np.ndarray:
    """
    LP-specific preprocessing: respects crop_region (useful for narrowing the
    frame to a single gate lane), but deliberately SKIPS resize_dims.

    resize_dims is typically tuned for the intrusion/face-detection worker,
    which only needs a small frame. Plate text occupies a tiny fraction of
    the image, so downscaling to something like 640x480 can shrink a real
    plate down to a handful of pixels — too small for any OCR model to read,
    even though the plate detector may still flag a low-confidence box there.
    """
    if camera.crop_region:
        crop_region = eval(camera.crop_region)
        frame = frame[
            crop_region[0][1]:crop_region[1][1],
            crop_region[0][0]:crop_region[1][0],
        ]
    return frame


redis_client_ws = redis.from_url(settings.REDIS_URL)


def publish_frame(camera_id: int, annotated_frame: np.ndarray):
    """
    Store the latest annotated frame in Redis as a simple key-value (not pub/sub).
    This matches the polling-based WebSocket route in api/cameras/websocket.py,
    which reads `camera_{camera_id}_frame_latest` — NOT a pub/sub channel.
    Only the latest frame is kept (2s expiry) to avoid buffer overflow.
    """
    global redis_client_ws

    try:
        if redis_client_ws.get(f"camera_{camera_id}_websocket_active") != b"True":
            return

        _, buffer = cv2.imencode(".jpg", annotated_frame)

        try:
            redis_client_ws.setex(
                f"camera_{camera_id}_frame_latest",
                2,  # expiry in seconds — auto-cleans if worker stops publishing
                buffer.tobytes(),
            )
        except (redis.ConnectionError, redis.TimeoutError):
            redis_client_ws = redis.from_url(settings.REDIS_URL)
            redis_client_ws.setex(
                f"camera_{camera_id}_frame_latest",
                2,
                buffer.tobytes(),
            )
    except Exception as e:
        logging.error(f"[Camera {camera_id}] Failed to publish frame: {e}")


# ──────────────────────────────────────────────────────────────────────────────
# Database persistence  (duplicate-guard + image save)
# ──────────────────────────────────────────────────────────────────────────────
LP_DEDUP_WINDOW_MINUTES = 5  # same window as the Redis TTL, kept in sync


def handle_license_plate_event(
    camera_id: int,
    license_number: str,
    confidence: float,
    bounding_box: list,          # [x1, y1, x2, y2]
    frame: np.ndarray = None,
    faces_detected: int = 0,
) -> bool:
    """
    Persists a license plate detection to the database.

    Duplicate prevention is authoritative here (DB-checked), not just
    Redis-cached — Redis is a fast-path optimization in process_feed, but
    this function independently verifies no recent record exists for the
    same camera+plate before writing anything to disk or the DB. This
    guarantees no duplicate image files or rows can be created even if the
    Redis TTL key expires early, is evicted, or races across processes.

    Returns True if a new record was created, False if skipped as a duplicate.
    """
    from datetime import timedelta

    current_time = datetime.now()
    cutoff = current_time - timedelta(minutes=LP_DEDUP_WINDOW_MINUTES)

    db: Session = SessionLocal()
    try:
        # ── Authoritative duplicate check (DB is the source of truth) ──────
        existing = (
            db.query(License)
            .filter(
                License.camera_id == camera_id,
                License.license_number == license_number,
                License.timestamp >= cutoff,
            )
            .first()
        )
        if existing:
            logging.info(
                f"[Camera {camera_id}] Duplicate suppressed — plate "
                f"'{license_number}' already recorded at {existing.timestamp} "
                f"(within {LP_DEDUP_WINDOW_MINUTES}-minute window). "
                f"No new image or DB row created."
            )
            return False

        logging.info(
            f"Persisting plate '{license_number}' for camera {camera_id} "
            f"(conf={confidence:.2f})"
        )

        # ── Only write the image file once we know this is NOT a duplicate ──
        file_path = None
        if frame is not None:
            frame_to_save = frame.copy()

            # Re-draw face boxes on saved image if faces were present
            if faces_detected > 0:
                faces = detect_faces_in_frame(frame_to_save)
                for face in faces:
                    x1, y1, x2, y2 = face['bbox']
                    conf = face['confidence']
                    cv2.rectangle(frame_to_save, (x1, y1), (x2, y2), (255, 0, 0), 2)
                    label = f"Face {conf:.2f}"
                    cv2.putText(frame_to_save, label, (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 4, cv2.LINE_AA)
                    cv2.putText(frame_to_save, label, (x1, y1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)

            # Save plate image  →  assets/licence_plates/
            timestamp_str = int(current_time.timestamp())
            filename = f"plate_{camera_id}_{license_number}_{timestamp_str}.jpg"
            file_path = os.path.join(PLATE_IMAGE_DIR, filename)
            cv2.imwrite(file_path, frame_to_save)
            logging.info(f"Plate image saved: {file_path}")

        new_record = License(
            camera_id=camera_id,
            license_number=license_number,
            confidence=round(confidence, 4),
            bounding_box=json.dumps(bounding_box),
            timestamp=current_time,
            file_path=file_path,
        )
        db.add(new_record)

        # Update user entry timestamp if plate matches a registered user
        user = db.query(Users).filter(Users.license_plate == license_number).first()
        if user:
            user.entered_at_timestamp = current_time
            logging.info(f"Updated entered_at_timestamp for user: {user.username}")

        db.commit()
        db.refresh(new_record)
        logging.info(f"DB record created: license_detection id={new_record.id}")
        return True
    except Exception as e:
        logging.error(f"Error saving license plate detection: {e}")
        db.rollback()
        return False
    finally:
        db.close()


# ──────────────────────────────────────────────────────────────────────────────
# Main processing task
# ──────────────────────────────────────────────────────────────────────────────
@license_plate_worker_app.task
def process_feed(camera_id: int):
    """
    Core Celery task: pulls frames from an RTSP/file source, runs fast-alpr
    plate detection + OCR, and persists results.

    NOTE: Intrusion detection logic lives in a completely separate worker
    (model_worker / full_feed_worker). This task is ONLY started when
    camera.detect_intrusions is False.
    """
    redis_client = redis.from_url(settings.REDIS_URL)

    try:
        db: Session = SessionLocal()
        camera = db.query(Camera).filter(Camera.id == camera_id).first()
        db.close()

        if not camera:
            logging.error(f"Camera {camera_id} not found.")
            return {"error": "Camera not found"}

        # Safety guard: never run licence plate worker alongside intrusion detection
        if camera.detect_intrusions:
            logging.info(
                f"Camera {camera_id} has intrusion detection enabled – "
                "skipping license plate worker."
            )
            return {"status": "Skipped: intrusion detection enabled"}

        redis_client.set(f"camera_{camera_id}_license_plate_flag", "False")

        def cap_factory():
            cap = open_capture(camera.url, camera_id, max_tries=3, timeout=2)
            cap.set(cv2.CAP_PROP_BUFFERSIZE, 1)
            return cap

        # Background thread continuously grabs frames — decouples capture
        # rate from inference time, exactly like the intrusion feed.
        grabber = FrameGrabber(cap_factory, camera_id)
        grabber.start()

        stop_check_counter = 300
        frame_counter = 0
        max_frame_skip_count = 0
        logging.info(f"[LP Worker] Camera {camera_id}: processing started.")

        while True:
            frame = grabber.get_latest_frame()
            if frame is None:
                max_frame_skip_count += 1
                time.sleep(0.01)
                if max_frame_skip_count > 500:
                    logging.error(f"Camera {camera_id}: No frames received. Exiting gracefully.")
                    break
                continue

            max_frame_skip_count = 0

            frame_counter += 1
            if frame_counter % 100 == 0:
                logging.info(
                    f"[Camera {camera_id}] Heartbeat — {frame_counter} frames "
                    f"processed so far, worker is alive."
                )

            annotated_frame = preprocess_frame_for_lp(frame, camera)

            if frame_counter % 100 == 1:  # log once per heartbeat cycle, not every frame
                logging.info(
                    f"[Camera {camera_id}] Frame fed to fast-alpr: "
                    f"{annotated_frame.shape[1]}x{annotated_frame.shape[0]}px "
                    f"(camera.resize_dims={camera.resize_dims!r}, "
                    f"camera.crop_region={camera.crop_region!r})"
                )

            # ── fast-alpr inference ──────────────────────────────────────────
            alpr_results = alpr.predict(annotated_frame)

            if alpr_results:
                logging.info(
                    f"[Camera {camera_id}] fast-alpr found {len(alpr_results)} "
                    f"plate candidate(s) this frame."
                )

            best_plate: str = ""
            best_confidence: float = 0.0
            best_bbox: list = []
            plate_detected = False

            for result in alpr_results:
                # result.detection  → plate bounding box info
                # result.ocr        → OCR text + confidence
                if result.ocr is None:
                    logging.debug(f"[Camera {camera_id}] Plate detected but OCR returned None.")
                    continue

                # Log detector geometry/confidence FIRST — this is what tells us
                # whether the crop fed to OCR was even plausible (too small,
                # wrong aspect ratio, etc.) before we look at OCR output.
                det_box = result.detection.bounding_box
                det_conf = getattr(result.detection, "confidence", None)
                box_w = int(det_box.x2) - int(det_box.x1)
                box_h = int(det_box.y2) - int(det_box.y1)
                logging.info(
                    f"[Camera {camera_id}] Detector box: "
                    f"({int(det_box.x1)},{int(det_box.y1)})-({int(det_box.x2)},{int(det_box.y2)}) "
                    f"size={box_w}x{box_h}px, detector_confidence={det_conf}"
                )

                raw_text: str = result.ocr.text or ""
                raw_conf = result.ocr.confidence
                # OcrResult.confidence can be a single float OR a list of
                # per-character floats — normalize to a single average value.
                if isinstance(raw_conf, (list, tuple)):
                    ocr_conf: float = (sum(raw_conf) / len(raw_conf)) if raw_conf else 0.0
                else:
                    ocr_conf: float = float(raw_conf or 0.0)

                logging.info(
                    f"[Camera {camera_id}] Raw OCR result: text='{raw_text}', "
                    f"confidence={ocr_conf:.3f}"
                )

                if not raw_text or ocr_conf < 0.60:
                    logging.info(
                        f"[Camera {camera_id}] Rejected — empty text (model likely decoded "
                        f"only pad/blank characters from a low-quality crop) or confidence "
                        f"{ocr_conf:.3f} below 0.60 threshold. Crop was {box_w}x{box_h}px."
                    )
                    continue

                # Extract bounding box from detection result
                box = result.detection.bounding_box  # BoundingBox object
                x1 = int(box.x1)
                y1 = int(box.y1)
                x2 = int(box.x2)
                y2 = int(box.y2)

                # Apply Pakistan plate OCR rules
                valid, cleaned_text = apply_lp_ocr_rules(raw_text)

                if not valid:
                    logging.info(
                        f"[Camera {camera_id}] Rejected by regex/prefix rules: "
                        f"raw='{raw_text}' cleaned='{cleaned_text}'"
                    )
                    # Draw rejected plate in red
                    cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                    continue

                logging.info(
                    f"[Camera {camera_id}] ACCEPTED plate '{cleaned_text}' "
                    f"(confidence={ocr_conf:.3f})"
                )

                # Keep the highest-confidence valid plate per frame
                if ocr_conf > best_confidence:
                    best_confidence = ocr_conf
                    best_plate = cleaned_text
                    best_bbox = [x1, y1, x2, y2]
                    plate_detected = True

                # Draw accepted plate in green
                cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)
                label = f"{cleaned_text} ({ocr_conf * 100:.1f}%)"
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 4, cv2.LINE_AA)
                cv2.putText(annotated_frame, label, (x1, y1 - 10),
                            cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)

            # ── Face detection (when a valid plate is found) ─────────────────
            faces = []
            if plate_detected and best_plate:
                faces = detect_faces_in_frame(annotated_frame)
                for face in faces:
                    fx1, fy1, fx2, fy2 = face['bbox']
                    fconf = face['confidence']
                    cv2.rectangle(annotated_frame, (fx1, fy1), (fx2, fy2), (255, 0, 0), 2)
                    flabel = f"Face {fconf:.2f}"
                    cv2.putText(annotated_frame, flabel, (fx1, fy1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (0, 0, 0), 4, cv2.LINE_AA)
                    cv2.putText(annotated_frame, flabel, (fx1, fy1 - 10),
                                cv2.FONT_HERSHEY_SIMPLEX, 0.5, (255, 255, 255), 2, cv2.LINE_AA)

            # ── Publish annotated frame to WebSocket consumers ───────────────
            if redis_client.get(f"camera_{camera_id}_websocket_active") == b"True":
                publish_frame(camera_id, annotated_frame)

            # ── Persist detection (Redis TTL deduplication) ──────────────────
            if plate_detected and best_plate and best_confidence >= 0.85:
                normalized = normalize_plate(best_plate)
                redis_key = f"camera_{camera_id}_lp_{normalized}"

                if not redis_client.exists(redis_key):
                    handle_license_plate_event(
                        camera_id=camera_id,
                        license_number=normalized,
                        confidence=best_confidence,
                        bounding_box=best_bbox,
                        frame=annotated_frame,
                        faces_detected=len(faces),
                    )
                    # 5-minute dedup window
                    redis_client.set(redis_key, "1", ex=300)
                else:
                    logging.debug(
                        f"Plate '{normalized}' already recorded recently for camera {camera_id}."
                    )

            # ── Stop-signal check (every 300 frames) ─────────────────────────
            stop_check_counter -= 1
            if stop_check_counter <= 0:
                stop_check_counter = 300
                cam_running = redis_client.get(f"camera_{camera_id}_running")
                global_running = redis_client.get("license_plate_workers_running")
                if cam_running == b"False" or global_running == b"False":
                    logging.info(f"Stop signal received for camera {camera_id}.")
                    break

    except Exception as e:
        logging.exception(f"Unhandled error in process_feed for camera {camera_id}: {e}")
    finally:
        try:
            grabber.stop()
        except NameError:
            pass  # grabber was never created (failed before reaching that point)
        redis_client.close()
        logging.info(f"[LP Worker] Camera {camera_id}: worker stopped.")

    return {"status": "License plate detection stopped."}


# ──────────────────────────────────────────────────────────────────────────────
# Worker management tasks
# ──────────────────────────────────────────────────────────────────────────────
@license_plate_worker_app.task
def start_license_plate_worker(camera_id: int):
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_running", "True")
    redis_client.close()
    license_plate_worker_app.send_task(
        "core.celery.license_plate_worker.process_feed",
        args=[camera_id],
        queue="license_plate_tasks",
    )
    return f"License plate worker started for camera {camera_id}"


@license_plate_worker_app.task
def start_all_license_plate_workers(camera_ids: list):
    os.makedirs(PLATE_IMAGE_DIR, exist_ok=True)
    if not camera_ids:
        logging.warning("No cameras supplied to start_all_license_plate_workers.")
        return "No cameras found"
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("license_plate_workers_running", "True")
    redis_client.close()
    tasks = group(start_license_plate_worker.s(cid) for cid in camera_ids)
    return tasks.apply_async(queue="license_plate_tasks", priority=10)


@license_plate_worker_app.task
def stop_license_plate_worker(camera_id: int):
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set(f"camera_{camera_id}_running", "False")
    redis_client.close()
    return f"License plate worker stopping for camera {camera_id}..."


@license_plate_worker_app.task
def stop_all_license_plate_workers():
    redis_client = redis.from_url(settings.REDIS_URL)
    redis_client.set("license_plate_workers_running", "False")
    redis_client.close()
    return "All license plate workers stopping..."