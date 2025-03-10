from celery import Celery
from config import settings
# Create Celery instance

celery_app = Celery(
    "worker",
    broker=settings.REDIS_URL,
    backend=settings.REDIS_URL
)

# Auto-discover tasks in alert_tasks and tasks
celery_app.autodiscover_tasks(["core.celery.alert_tasks", "core.celery.tasks"])
