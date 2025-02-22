from fastapi import FastAPI
import logging

# Middleware
from middleware.JWTAuth import JWTAuthenticationMiddleware  
from middleware.ip_middleware import IPMiddleware  

# DB
from core.database import test_db_connection  

# Routers (uncomment when needed)
from api.auth.routes import router as auth_router  
from api.cameras.routes import router as cameras_router
from api.alerts.routes import router as alerts_router
from api.users.routes import router as users_router
# from api.intrusion.routes import router as intrusion_router

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

# Authentication middleware
# app.add_middleware(JWTAuthenticationMiddleware)
# IP middleware
# app.add_middleware(IPMiddleware)

# Routes
app.include_router(auth_router)
app.include_router(users_router)
app.include_router(cameras_router)
app.include_router(alerts_router)
# app.include_router(intrusion_router, prefix="/intrusion", tags=["intrusion"])

from core.celery.worker import add


@app.get("/")
async def root():
    results = add.delay(10, 20)
    results_get = results.get()
    return {"message": f"Hello World. This is the Smart Campus project! Celery Check 10+20 = {results_get}"}
    # return {"message": "Hello World. This is the Smart Campus project!"}
