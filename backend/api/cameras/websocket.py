from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis
import asyncio
from collections import defaultdict
import json

# Redis client setup
redis_client = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)

# WebSocket router
router = APIRouter()

# Dictionary to manage WebSocket connections per camera (for frames)
frame_connections = defaultdict(set)

# Set to manage WebSocket connections for all frames (all cameras)
all_frame_connections = set()

# Redis Listener for Frames 
async def redis_frame_listener():
    """Listens for video frames from Redis and broadcasts them to WebSockets."""
    pubsub = redis_client.pubsub()
    pubsub.psubscribe("camera_frames:*")  # Listening to all camera frame channels

    while True:
        message = pubsub.get_message(ignore_subscribe_messages=True)
        if message:
            print(f"📨 Redis Frame Received: {message}")  # Debug log
            channel = message["channel"]
            frame_data = message["data"]
            camera_id = channel.split(":")[-1]

            print(f"Received frame for camera {camera_id}")
            await broadcast_frame(camera_id, frame_data)

        await asyncio.sleep(0.1)  # Prevents busy-waiting

# Broadcasting Frames 
async def broadcast_frame(camera_id: str, frame_data: str):
    """Sends frames to WebSocket clients subscribed to a specific camera and all frames."""
    to_remove = set()
    message = json.dumps({"camera_id": camera_id, "frame": frame_data})

    # Broadcast to specific camera connections
    if camera_id in frame_connections:
        for connection in frame_connections[camera_id]:
            try:
                await connection.send_text(message)
            except Exception:
                to_remove.add(connection)

    # Broadcast to clients subscribed to all frames
    for connection in all_frame_connections:
        try:
            await connection.send_text(message)
        except Exception:
            to_remove.add(connection)

    # Remove disconnected clients
    for conn in to_remove:
        for camera in frame_connections.keys():
            frame_connections[camera].discard(conn)
        if not frame_connections[camera]:
            del frame_connections[camera]

        all_frame_connections.discard(conn)

# WebSocket for Frames (Per Camera) 
@router.websocket("/ws/frames/{camera_id}")
async def websocket_camera_frames(websocket: WebSocket, camera_id: str):
    """Handles WebSocket connections for video frames from a specific camera."""
    await websocket.accept()
    frame_connections[camera_id].add(websocket)
    print(f"Client connected to video frames for camera {camera_id}")

    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        print(f"Client disconnected from camera frames {camera_id}")
    finally:
        frame_connections[camera_id].discard(websocket)
        if not frame_connections[camera_id]:
            del frame_connections[camera_id]

# WebSocket for All Frames 
@router.websocket("/ws/frames")
async def websocket_all_frames(websocket: WebSocket):
    """Handles WebSocket connections for video frames from all cameras."""
    await websocket.accept()
    all_frame_connections.add(websocket)
    print("Client connected to all video frames")

    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        print("Client disconnected from all video frames")
    finally:
        all_frame_connections.discard(websocket)

# Function to start Redis frame listener on startup
async def start_redis_frame_listener():
    asyncio.create_task(redis_frame_listener())
