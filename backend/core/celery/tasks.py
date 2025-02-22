from .worker import celery_app
import json
import redis

# Redis connection for pub/sub
redis_client = redis.Redis(host="redis", port=6379, db=0)

@celery_app.task
def publish_alert(alert_data):
    """Publishes alert messages to Redis Pub/Sub"""
    redis_client.publish("alerts_channel", json.dumps(alert_data))
    return "Alert published successfully"