from .worker import celery_app
from celery import shared_task
import json
import redis
# import os
# from dotenv import load_dotenv
# load_dotenv(override=True)

# Redis connection for pub/sub
# redis_client = redis.Redis(host="redis", port=6379, db=0)

# @celery_app.task
@shared_task
def publish_alert(alert_data):
    """Publishes alert messages to Redis Pub/Sub"""
    # redis_client.publish("alerts_channel", json.dumps(alert_data))
    return "Alert published successfully"


@shared_task
def add(x, y):
    return x + y