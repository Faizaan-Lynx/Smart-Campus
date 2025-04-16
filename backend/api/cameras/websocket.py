from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import redis
import asyncio
from collections import defaultdict
import logging
logging.basicConfig(level=logging.INFO)



# Redis client setup
redis_client = redis.Redis(host="redis", port=6379, db=0)

# WebSocket router
router = APIRouter()

# Dictionary to manage WebSocket connections per camera (for frames)
frame_connections = defaultdict(set)

# Set to manage WebSocket connections for all frames (all cameras)
all_frame_connections = set()

# Redis Listener for Frames 
async def redis_frame_listener():
    """Persistent Redis pubsub listener that reconnects only when the server closes the connection."""
    while True:
        try:
            pubsub = redis_client.pubsub()
            pubsub.psubscribe("camera_*")
            logging.info("Subscribed to Redis channels for frames.")

            while True:
                message = pubsub.get_message(ignore_subscribe_messages=True, timeout=1)
                if message:
                    channel = message["channel"]
                    if isinstance(channel, bytes):
                        channel = channel.decode("utf-8")
                    frame_data = message["data"]
                    camera_id = channel.split("_")[-1]
                    await broadcast_frame(camera_id, frame_data)

                await asyncio.sleep(0.025)  # Light async sleep to keep loop responsive

        except redis.exceptions.ConnectionError as e:
            logging.warning(f"Redis connection lost: {e}. Attempting reconnect in 3 seconds...")
            await asyncio.sleep(3)
        except Exception as e:
            logging.exception(f"Unexpected error in redis_frame_listener: {e}")
            await asyncio.sleep(3)


async def broadcast_frame(camera_id: str, frame_data: bytes):
    """Sends frames to WebSocket clients subscribed to a specific camera and all frames."""
    to_remove = set()

    # Broadcast to specific camera connections
    if camera_id in frame_connections:
        for connection in frame_connections[camera_id]:
            try:
                await connection.send_bytes(frame_data)  # Send as raw bytes
            except Exception:
                to_remove.add(connection)

    # Broadcast to clients subscribed to all frames
    for connection in all_frame_connections:
        try:
            await connection.send_bytes(frame_data)  # Send as raw bytes
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
    redis_client.set(f"camera_{camera_id}_websocket_active", "True")

    try:
        while True:
            await asyncio.sleep(1)  # 🔁 Just keep the loop alive
    except WebSocketDisconnect:
        print(f"Client disconnected from camera frames {camera_id}")
    finally:
        redis_client.set(f"camera_{camera_id}_websocket_active", "False")
        frame_connections[camera_id].discard(websocket)
        if not frame_connections[camera_id]:
            del frame_connections[camera_id]

# WebSocket for All Frames 
@router.websocket("/ws/frames")
async def websocket_all_frames(websocket: WebSocket):
    await websocket.accept()
    all_frame_connections.add(websocket)
    print("Client connected to all video frames")

    try:
        while True:
            await asyncio.sleep(1)  # 🔁 Keep connection open
    except WebSocketDisconnect:
        print("Client disconnected from all video frames")
    finally:
        all_frame_connections.discard(websocket)


# Function to start Redis frame listener on startup
async def start_redis_frame_listener():
    asyncio.create_task(redis_frame_listener())