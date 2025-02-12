from fastapi import FastAPI
# from core.celery import worker, tasks

app = FastAPI()

@app.get("/")
async def root():
    return {"message": "Hello World"}