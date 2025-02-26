import json
import redis
from config import settings
from .worker import celery_app
from billiard import current_process

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


@celery_app.task
def name_checker():
    worker_name = name_checker.request.hostname
    args = name_checker.request.args

    return {
        "worker_name": worker_name,
        "args": args
    }


@celery_app.task
def print_process_id():
    process_id = current_process().index
    print(process_id)
    return process_id