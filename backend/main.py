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

import numpy as np
import cv2
import base64
import json
import logging
import redis
from core.celery.feed_task import publish_frame
from core.celery.feed_worker import process_frame

@app.post("/test_publish_feed/")
async def test_publish_feed():
    """
    Test function to generate a synthetic random frame, process it, and publish the result.
    """
    try:
        camera_id = 1
        # Create a random frame with the same dimensions (720, 1280, 3)
        frame = np.random.randint(0, 256, (720, 1280, 3), dtype=np.uint8)

        # Process the synthetic frame
        result = process_frame(camera_id, frame)

        # Check if process_frame returned an annotated frame
        if result and "status" in result:
            # Publish the annotated frame
            publish_result = publish_frame(camera_id, frame)

            return {
                "status": "Success",
                "message": "Processed and published a random synthetic frame",
                "process_result": result,
                "publish_result": publish_result
            }
        else:
            return {"status": "Error", "message": "Failed to process frame"}

    except Exception as e:
        logging.exception(e)
        return {"status": "Error", "message": str(e)}