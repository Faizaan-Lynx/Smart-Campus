from celery import Celery
from config import settings
import json
import redis
import asyncio

# Redis client for pub/sub
redis_client = redis.Redis(host="localhost", port=6379, db=0, decode_responses=True)

@celery.task
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