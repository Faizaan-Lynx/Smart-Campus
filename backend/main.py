from fastapi import FastAPI
from config import settings
import logging
import redis
import asyncio 

# Middleware
# from middleware.JWTAuth import JWTAuthenticationMiddleware  
# from middleware.ip_middleware import IPMiddleware  
from fastapi.middleware.cors import CORSMiddleware

# DB
from core.database import test_db_connection  

# Routers (uncomment when needed)
from api.auth.routes import router as auth_router  
from api.cameras.routes import router as cameras_router
from api.users.routes import router as users_router
from api.user_cameras.routes import router as user_cameras_router
from api.alerts.routes import router as alerts_router
from api.intrusion.routes import router as intrusion_router

# Import WebSocket Router
from api.alerts.websocket import router, start_redis_listener

# WebSockets for alerts
from api.alerts.routes import router as alerts_router;

# Celery Workers
from core.celery.worker import celery_app
from core.celery.feed_worker import feed_worker_app

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
app.include_router(router)
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

@app.get("/tasks")
async def list_celery_tasks():
    inspector = celery_app.control.inspect()
    
    registered_tasks = inspector.registered_tasks()
    
    if not registered_tasks:
        return {"error": "No registered tasks found. Ensure Celery is running."}

    return {"registered_tasks": registered_tasks}

@app.get("/worker_name")
async def worker_name():
    result = celery_app.send_task("core.celery.tasks.name_checker")
    return {"worker_name": result.get()}


@app.get("/feed_worker_test")
async def feed_worker_test():
    result = feed_worker_app.send_task("core.celery.feed_worker.fetch_and_process_cameras")
    return {"worker_name": result.get()}