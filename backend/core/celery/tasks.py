from core.celery.worker import celery_app

# test task
@celery_app.task
def subtract(a: int, b: int):
    return a - b