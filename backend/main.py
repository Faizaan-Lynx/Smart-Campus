from fastapi import FastAPI

# middleware
from middleware.JWTAuth import JWTAuthenticationMiddleware  
from middleware.ip_middleware import IPMiddleware  

# Routers
from api.users.routes import router as user_router
# from api.cameras.routes import router as cameras_router
# from api.alerts.routes import router as alerts_router
# from api.intrusion.routes import router as intrusion_router

app = FastAPI()

# authentication middleware
app.add_middleware(JWTAuthenticationMiddleware)
# IP middleware
app.add_middleware(IPMiddleware)


# routes
app.include_router(user_router, prefix="/auth", tags=["auth"])
# app.include_router(cameras_router, prefix="/camera", tags=["cameras"])
# app.include_router(alerts_router, prefix="/alerts", tags=["alerts"])
# app.include_router(intrusion_router, prefix="/intrusion", tags=["intrusion"])


@app.get("/")
async def root():
    return {"message": "Hello World. This is the Smart Campus project!"}