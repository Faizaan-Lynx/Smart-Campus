from celery import shared_task
from config import settings
import json
import redis

# Redis client for pub/sub
redis_client = redis.Redis(host="redis", port="6379", db=0, decode_responses=True)

@shared_task(name="core.celery.alert_tasks.publish_alert")
def publish_alert(alert_data: dict):
    """
    Publishes an alert to the Redis Pub/Sub channel for real-time updates.
    """
    camera_id = alert_data.get("camera_id")
    if not camera_id:
        return {"error": "Camera ID is required"}

    channel = f"camera_alerts:{camera_id}"  # Format Redis channel name
    redis_client.publish(channel, json.dumps(alert_data))  # Publish to Redis
    
    return {"status": "Alert published successfully"}