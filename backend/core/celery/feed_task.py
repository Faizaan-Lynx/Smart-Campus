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
def publish_frame(camera_id: int, annotated_frame):
    try:
        logging.info(f"Publishing frame for camera_id: {camera_id}")

        if not isinstance(annotated_frame, str):
            logging.error("Frame is not in Base64 string format.")
            return {"error": "Invalid frame format"}

        # Publish to Redis as JSON
        redis_data = json.dumps({"camera_id": camera_id, "frame": annotated_frame})
        redis_client.publish(f"camera_{camera_id}", redis_data)

        logging.info("Frame published successfully.")
        return {"status": "Frame published successfully"}

    except Exception as e:
        logging.exception(f"Error publishing frame: {e}")
        return {"error": "Failed to publish frame"}
