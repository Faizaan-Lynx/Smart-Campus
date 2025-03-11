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
from core.celery.feed_worker import process_cameras, stop_feed_worker


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
    red = redis.Redis(host="redis", port=6379, db=0)

    return  {
                "status": "OK",
                "celery_calculation": result.get(),
                "redis_check": red.ping(),
                "sqlalchemy_check": test_db_connection()
            }


@app.get("/feed_worker_start")
async def feed_worker_test():
    for i in range(settings.FEED_WORKERS):
        process_cameras.apply_async(queue='feed_tasks', args=[i+1], priority=10)
    return {"status": "Feed workers started."}


@app.get("/feed_worker_stop")
async def feed_worker_stop():
    for _ in range(settings.FEED_WORKERS):
        stop_feed_worker.apply_async(queue='feed_tasks', priority=0)
    return {"status": "All feed workers stopped."}