import os
from celery import Celery

# Create Celery instance
celery_app = Celery(
    "worker",
    broker=os.getenv("REDIS_URL", "redis://redis:6379/0"),
    backend=os.getenv("REDIS_URL", "redis://redis:6379/0"),
)

# Auto-discover tasks in the `tasks.py` file
celery_app.autodiscover_tasks(["core.celery"])