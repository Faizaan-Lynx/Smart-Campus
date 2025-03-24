from celery import shared_task
import redis
import logging

# Redis client for pub/sub
redis_client = redis.Redis(host="redis", port=6379, db=0)  # Removed decode_responses=True

@shared_task(name="core.celery.frame_tasks.publish_frame")
def publish_frame(camera_id: int, annotated_frame: bytes):
    try:
        logging.info(f"Publishing frame for camera_id: {camera_id}")

        if not isinstance(annotated_frame, bytes):
            logging.error("Frame is not in bytes format.")
            return {"error": "Invalid frame format"}

        # Publish to Redis as raw bytes
        redis_client.publish(f"camera_{camera_id}", annotated_frame)

        logging.info("Frame published successfully.")
        return {"status": "Frame published successfully"}

    except Exception as e:
        logging.exception(f"Error publishing frame: {e}")
        return {"error": "Failed to publish frame"}