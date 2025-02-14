from celery.worker import celery_app

# test task
@celery_app.task
def add(a: int, b: int):
    return a + b