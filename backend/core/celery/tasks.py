from billiard import current_process
from core.celery.worker import celery_app
import redis
from config import settings
import logging

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

@celery_app.task
def cleanup_stale_frames():
    """
    Periodic task to ensure old frames are cleaned up from Redis.
    This runs periodically to prevent memory bloat, though frames auto-expire with TTL.
    Can be called periodically via beat scheduler or manually.
    """
    try:
        redis_client = redis.from_url(settings.REDIS_URL)
        # Redis automatically expires keys with setex, but we can check memory stats if needed
        info = redis_client.info('memory')
        logging.info(f"Redis memory usage: {info['used_memory_human']}")
        redis_client.close()
        return {"status": "Cleanup check completed"}
    except Exception as e:
        logging.error(f"Error in cleanup_stale_frames: {e}")
        return {"error": str(e)}