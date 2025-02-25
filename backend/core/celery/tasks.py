import json
import redis
from config import settings
from .worker import celery_app

# redis connection for pub/sub
redis_client = redis.from_url(settings.REDIS_URL)

@celery_app.task
def publish_alert(alert_data):
    """Publishes alert messages to Redis Pub/Sub"""
    redis_client.publish("alerts_channel", json.dumps(alert_data))
    return "Alert published successfully"


@celery_app.task
def add(x, y):
    return x + y