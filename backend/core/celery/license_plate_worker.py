import cv2
import numpy as np
import time
import re
from ultralytics import YOLO
from paddleocr import PaddleOCR
from ultralytics.utils.plotting import save_one_box
from redis import Redis
from rq import Queue
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("LicensePlateWorker")

# Redis connection and queue setup
redis_conn = Redis(host='localhost', port=6379, db=0)
queue = Queue('license_plate_jobs', connection=redis_conn)


def open_capture(source, capped_fps=True, restart_on_end=True, framerate=30):
    cap = cv2.VideoCapture(source)
    if capped_fps:
        cap.set(cv2.CAP_PROP_FPS, framerate)
    return cap


def release_capture(cap):
    cap.release()


def publish_frame(redis_conn, key, frame):
    _, buffer = cv2.imencode('.jpg', frame)
    redis_conn.set(key, buffer.tobytes())


def unsharp_mask(image: np.ndarray, kernel_size=(5, 5), sigma=1.0, amount=0.5) -> np.ndarray:
    blurred = cv2.GaussianBlur(image, kernel_size, sigma)
    sharpened = cv2.addWeighted(image, 1.0 + amount, blurred, -amount, 0)
    return sharpened


def lp_image_processing(image: np.ndarray, clahe) -> np.ndarray:
    processed_img = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    processed_img = cv2.resize(processed_img, (2 * processed_img.shape[1], 2 * processed_img.shape[0]))
    processed_img = clahe.apply(processed_img)
    processed_img = unsharp_mask(processed_img)
    return processed_img


def apply_lp_ocr_rules(license_plate: str, class_name: str) -> tuple[bool, str]:
    text = license_plate.replace(' ', '')
    car_bus_pattern = r'^[A-Za-z]{3}\d{3}[A-Za-z]{1}$'  # 3 letters, 3 digits, 1 letter
    motorcycle_pattern = r'^[A-Za-z]{2}\d{3}[A-Za-z]{1}$'  # 2 letters, 3 digits, 1 letter

    if class_name in ("car", "bus") and re.match(car_bus_pattern, text):
        return True, text

    if class_name == "motorcycle" and re.match(motorcycle_pattern, text):
        return True, text

    return False, text


def license_plate_ocr(ocr, clahe, plate_img: np.ndarray, class_name: str) -> tuple[str, float, bool]:
    preprocessed_image = lp_image_processing(plate_img, clahe)
    lp_results = ocr.ocr(preprocessed_image, cls=True)

    license_plate_number = ""
    confidence_scores = []

    if len(lp_results) == 0:
        return "", 0.0, False

    for lp_res in lp_results:
        if lp_res is None:
            continue
        for line in lp_res:
            license_plate_number += line[1][0]
            confidence_scores.append(int(float(line[1][1]) * 100))

    valid, license_plate_number = apply_lp_ocr_rules(license_plate_number, class_name)
    average_confidence = np.mean(confidence_scores) if confidence_scores else 0.0

    if license_plate_number == "":
        return "", 0.0, False
    return license_plate_number, average_confidence, valid


def detect_license_plates(frame, lp_model, ocr, clahe, conf_threshold=0.6):
    """
    Detect license plates in a given frame using YOLO model and OCR.

    Returns:
        list of tuples: [(lp_number, confidence, valid, box), ...]
    """
    detections = []
    results = lp_model.predict(frame, verbose=False, stream=True)

    for res in results:
        for det in res.boxes:
            conf = det.conf[0]
            if conf < conf_threshold:
                continue
            xyxy = det.xyxy
            cropped_lp = save_one_box(xyxy, frame.copy(), BGR=True, save=False)

            # Assume class_name is "car" here; you can modify if you also track vehicle class
            lp_number, confidence, valid = license_plate_ocr(ocr, clahe, cropped_lp, class_name="car")
            detections.append((lp_number, confidence, valid, xyxy))

    return detections


def process_video_feed(source, redis_conn, queue_key="license_plate_frame", framerate=5, resize=(1280, 720)):
    """
    Main loop for reading from the video source, detecting license plates, and publishing results.
    """

    logger.info(f"Starting license plate worker on source: {source}")

    cap = open_capture(source, capped_fps=True, framerate=framerate)

    lp_model = YOLO("./yolo-models/yolo-license-plates.pt")
    ocr = PaddleOCR(use_angle_cls=True, lang="en", show_log=False)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))

    while True:
        ret, frame = cap.read()
        if not ret:
            logger.warning("Failed to grab frame; retrying.")
            time.sleep(0.5)
            continue

        frame = cv2.resize(frame, resize)

        # Detect license plates in the frame
        detections = detect_license_plates(frame, lp_model, ocr, clahe)

        # Annotate frame with license plate info
        for lp_number, confidence, valid, xyxy in detections:
            x1, y1, x2, y2 = map(int, xyxy[0])
            color = (0, 255, 0) if valid else (0, 0, 255)
            cv2.rectangle(frame, (x1, y1), (x2, y2), color, 2)
            label = f"{lp_number} ({confidence:.2f})"
            cv2.putText(frame, label, (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.6, color, 2)

        # Publish the annotated frame as JPEG bytes to Redis
        publish_frame(redis_conn, queue_key, frame)

        # Sleep to control framerate
        time.sleep(1 / framerate)
