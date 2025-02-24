from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends
from sqlalchemy.orm import Session
import json
from api.alerts.schemas import AlertResponse, AlertCreate
from core.database import get_db
from models.alerts import Alert
from typing import List

router = APIRouter()
active_connections: List[WebSocket] = []

@router.websocket("/ws/alerts")
async def websocket_endpoint(websocket: WebSocket):
    """Handles WebSocket connections for live alerts."""
    await websocket.accept()
    active_connections.append(websocket)
    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        active_connections.remove(websocket)

async def send_alert(alert: AlertResponse):
    """Broadcasts a new alert to all connected clients."""
    message = json.dumps(alert.model_dump())
    for connection in active_connections:
        try:
            await connection.send_text(message)
        except:
            active_connections.remove(connection)  # Remove failed connection
