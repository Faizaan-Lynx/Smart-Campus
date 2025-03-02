from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis
import asyncio
from collections import defaultdict

# Redis client setup
redis_client = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)

# WebSocket router
router = APIRouter()

# Dictionary to manage WebSocket connections per camera
camera_connections = defaultdict(set)

# Set to manage WebSocket connections for all cameras
all_connections = set()

async def redis_listener():
    pubsub = redis_client.pubsub()
    pubsub.psubscribe("camera_alerts:*")

    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            channel = message["channel"]
            alert_data = message["data"]
            camera_id = channel.split(":")[-1]
            await broadcast_alert(camera_id, alert_data)

        await asyncio.sleep(0.1)  # Prevent CPU overload

async def broadcast_alert(camera_id: str, alert_data: str):
    """Sends alert messages to all WebSocket clients subscribed to a specific camera and all cameras."""
    to_remove = set()

    # Broadcast to specific camera connections
    for connection in camera_connections[camera_id]:
        try:
            await connection.send_text(alert_data)
        except:
            to_remove.add(connection)

    # Broadcast to clients subscribed to all cameras
    for connection in all_connections:
        try:
            await connection.send_text(alert_data)
        except:
            to_remove.add(connection)

    # Remove disconnected clients
    for conn in to_remove:
        camera_connections[camera_id].discard(conn)
        all_connections.discard(conn)

    # Clean up empty camera entries
    if not camera_connections[camera_id]:
        del camera_connections[camera_id]

@router.websocket("/ws/alerts/{camera_id}")
async def websocket_camera(websocket: WebSocket, camera_id: str):
    """Handles WebSocket connections for specific cameras."""
    await websocket.accept()
    camera_connections[camera_id].add(websocket)

    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        pass  # No need to raise exceptions
    finally:
        camera_connections[camera_id].discard(websocket)
        if not camera_connections[camera_id]:  # Clean up empty camera entries
            del camera_connections[camera_id]

@router.websocket("/ws/alerts")
async def websocket_all_cameras(websocket: WebSocket):
    """Handles WebSocket connections for all cameras."""
    await websocket.accept()
    all_connections.add(websocket)

    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        pass  # No need to raise exceptions
    finally:
        all_connections.discard(websocket)  # Remove safely

# Function to start Redis listener on startup
async def start_redis_listener():
    asyncio.create_task(redis_listener())