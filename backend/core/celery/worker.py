from celery import Celery

# celery app
celery_app = Celery('worker', broker='redis://redis:6379/0', backend='redis://redis:6379/0')
# optional config
celery_app.conf.result_expires = 3600
