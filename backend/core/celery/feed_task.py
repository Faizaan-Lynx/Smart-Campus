from celery import shared_task
import redis
import json
import base64
import cv2
import numpy as np
import logging

# Redis client for pub/sub
redis_client = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)

@shared_task(name="core.celery.frame_tasks.publish_frame")
def publish_frame(camera_id: int, annotated_frame, test_video_path: str = None):
    logging.info(f"Received task to publish frame for camera_id: {camera_id}")

    try:
        if annotated_frame is None:
            logging.warning("No frame provided for publishing.")
            return {"error": "No frame provided"}

        # Ensure the frame is a NumPy array
        if not isinstance(annotated_frame, np.ndarray):
            try:
                annotated_frame = np.array(annotated_frame, dtype=np.uint8)
            except Exception as e:
                logging.exception("Failed to convert frame to NumPy array.")
                return {"error": "Invalid frame format"}

        logging.debug("Encoding annotated frame to Base64...")

        # Encode frame to JPEG format
        success, buffer = cv2.imencode(".jpg", annotated_frame)
        if not success:
            logging.error("cv2.imencode failed to encode frame.")
            return {"error": "Failed to encode frame"}

        frame_base64 = base64.b64encode(buffer).decode("utf-8")

        # Publish frame to Redis
        frame_data = {"camera_id": camera_id, "frame": frame_base64}
        channel = f"camera_frames:{camera_id}"
        redis_client.publish(channel, json.dumps(frame_data))

        logging.info(f"Published annotated frame to Redis channel: {channel}")
        return {"status": "Frame published successfully"}

    except Exception as e:
        logging.exception("Failed to publish frame.")
        return {"error": "Failed to publish frame"}
