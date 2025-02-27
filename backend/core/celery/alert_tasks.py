from api.alerts.websocket import websocket_manager
from celery import Celery
import json
import redis
from config import settings

celery = Celery(
    "alert_tasks",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

@celery.task
def publish_alert(alert_data: dict):
    """Publish alert to Redis channel."""
    camera_id = alert_data.get("camera_id")
    if not camera_id:
        return {"error": "Camera ID is required"}

    redis_client.publish(f"camera_alerts:{camera_id}", json.dumps(alert_data))
    return {"status": "Alert published"}

@celery.task
def broadcast_alert(alert_data: dict):
    """Broadcast alert via WebSocket."""
    import asyncio
    camera_id = alert_data.get("camera_id")
    if camera_id:
        asyncio.run(websocket_manager.broadcast(camera_id, alert_data))
    return {"status": "Alert broadcasted"}