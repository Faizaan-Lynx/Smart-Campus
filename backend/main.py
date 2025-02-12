from fastapi import FastAPI

# middleware
from middleware.JWTAuth import JWTAuthenticationMiddleware  

# Routers
from api.auth.routes import router as auth_router
from api.cameras.routes import router as cameras_router
from api.alerts.routes import router as alerts_router
# from api.intrusion.routes import router as intrusion_router

app = FastAPI()

# add authentication middleware
app.add_middleware(JWTAuthenticationMiddleware)

# include routers
app.include_router(auth_router, prefix="/auth", tags=["auth"])
app.include_router(cameras_router, prefix="/camera", tags=["cameras"])
app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
# app.include_router(intrusion_router, prefix="/intrusion", tags=["intrusion"])


@app.get("/")
async def root():
    return {"message": "Hello World. This is the Smart Campus project!"}