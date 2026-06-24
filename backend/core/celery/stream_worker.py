import json
import redis
import logging
from celery import Celery
from config import settings

# Redis client for frame storage
stream_worker_app = Celery('stream_worker', broker=settings.REDIS_URL, backend=settings.REDIS_URL)
stream_worker_app.conf.update(
    task_time_limit=60,  
    broker_transport_options={'visibility_timeout': 3600},
    worker_heartbeat=60,
)

# redis client
redis_client = redis.from_url(settings.REDIS_URL)

@stream_worker_app.task
def publish_frame(camera_id: int, annotated_frame: bytes):
    """
    Store the latest annotated frame in Redis (not pub/sub).
    This prevents buffer overflow by only keeping the latest frame.
    """
    try:
        if not isinstance(annotated_frame, bytes):
            logging.error("Frame is not in bytes format.")
            return {"error": "Invalid frame format"}

        # Check if WebSocket is active before storing
        if redis_client.get(f"camera_{camera_id}_websocket_active") != b"True":
            return {"status": "No active WebSocket connections"}

        # Store to Redis with 2-second expiry (latest frame only, not queue)
        redis_client.setex(
            f"camera_{camera_id}_frame_latest",
            2,  # expiry in seconds
            annotated_frame
        )

        # logging.info(f"Frame stored for camera {camera_id}")
        return {"status": "Frame stored successfully"}

    except Exception as e:
        logging.exception(f"Error storing frame: {e}")
        return {"error": "Failed to store frame"}