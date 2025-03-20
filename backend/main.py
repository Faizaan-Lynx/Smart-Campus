# base imports
from fastapi import FastAPI
from config import settings
import logging
import redis
import asyncio 

# middlewares
# from middleware.JWTAuth import JWTAuthenticationMiddleware  
# from middleware.ip_middleware import IPMiddleware  
from fastapi.middleware.cors import CORSMiddleware

# database stuff
from core.database import test_db_connection  

# routers (uncomment when needed)
from api.auth.routes import router as auth_router  
from api.cameras.routes import router as cameras_router
from api.users.routes import router as users_router
from api.user_cameras.routes import router as user_cameras_router
from api.alerts.routes import router as alerts_router
from api.intrusion.routes import router as intrusion_router

# websocket for alerts
from api.alerts.websocket import router as alerts_websocket_router, start_redis_listener

# celery
from core.celery.worker import celery_app


app = FastAPI()


# Configure logging
logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s")
logger = logging.getLogger(__name__)


@app.on_event("startup")
def startup_db_check():
    """Test database connection on startup."""
    if test_db_connection():
        logger.info("✅ Database connected successfully.")
    else:
        logger.error("❌ Database connection failed on startup. Exiting...")
        exit(1)


# IP middleware
# app.add_middleware(IPMiddleware)
# Authentication middleware
# app.add_middleware(JWTAuthenticationMiddleware)
# CORS Middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Change to specific frontend URLs for better security
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods (GET, POST, PUT, DELETE, etc.)
    allow_headers=["*"],  # Allows all headers
)


# Routes
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(cameras_router)
app.include_router(user_cameras_router)
app.include_router(alerts_router)
app.include_router(intrusion_router)

# WebSocket Routes
app.include_router(alerts_websocket_router)


# routes for startup and some for testing and health checks
@app.on_event("startup")
async def startup_event():
    asyncio.create_task(start_redis_listener())


@app.get("/")
async def root():
    return {"message": "Hello World. This is the Smart Campus project!"}


@app.get("/health")
async def health():
    result = celery_app.send_task("core.celery.tasks.add", (4,4))
    red = redis.from_url(settings.REDIS_URL)

    return  {
                "status": "OK",
                "celery_calculation": result.get(),
                "redis_check": red.ping(),
                "sqlalchemy_check": test_db_connection()
            }

# tetsing

from celery.result import AsyncResult
import cv2
import numpy as np
import base64
from backend.core.celery.feed_task import publish_frame

@app.get("/test_publish_video/")
def test_publish_video(camera_id: int = 1, video_path: str = "backend/tests/vid2.mp4", frame_interval: int = 5):
    """
    Reads frames from a video file and publishes them using the Celery task.
    Parameters:
        - camera_id: The ID of the camera.
        - video_path: Path to the test video file.
        - frame_interval: Publish every Nth frame (to avoid sending too many frames).
    """
    try:
        logging.info(f"Opening video file {video_path}...")
        cap = cv2.VideoCapture(video_path)
        if not cap.isOpened():
            logging.error("Failed to open video file.")
            return {"error": "Could not open video file."}

        frame_count = 0
        task_ids = []

        while True:
            ret, frame = cap.read()
            if not ret:
                break  # End of video

            if frame_count % frame_interval == 0:
                annotated_frame = np.array(frame)
                task = publish_frame.delay(camera_id, annotated_frame)
                task_ids.append(task.id)

            frame_count += 1

        cap.release()
        return {"message": "Frames submitted to Celery.", "total_frames": frame_count, "task_ids": task_ids}

    except Exception as e:
        logging.exception("Error processing video file.")
        return {"error": str(e)}

@app.get("/task_status/")
def get_task_status(task_id: str):
    """
    Fetch the status of a Celery task.
    """
    result = AsyncResult(task_id)
    return {"task_id": task_id, "status": result.status, "result": result.result}