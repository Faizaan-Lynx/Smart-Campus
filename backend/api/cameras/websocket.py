from fastapi import APIRouter, WebSocket, WebSocketDisconnect, WebSocketException
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

# Dictionary to store per-camera polling tasks
camera_polling_tasks = {}

# Redis Listener for Frames - polling-based instead of pub/sub
async def poll_camera_frame(camera_id: str):
    """
    Poll Redis for the latest frame for a specific camera.
    This replaces pub/sub to prevent buffer overflow.
    Only runs if there are active WebSocket connections for this camera.
    """
    last_frame = None
    
    while camera_id in frame_connections and len(frame_connections[camera_id]) > 0:
        try:
            # Poll the latest frame from Redis (not pub/sub)
            frame_data = redis_client.get(f"camera_{camera_id}_frame_latest")
            
            if frame_data and frame_data != last_frame:
                # Only broadcast if frame is new (different from last one)
                last_frame = frame_data
                await broadcast_frame(camera_id, frame_data)
            
            # Poll every 25ms (40 FPS) to match UI refresh rate
            await asyncio.sleep(0.025)
            
        except redis.exceptions.ConnectionError as e:
            logging.warning(f"Redis connection lost for camera {camera_id}: {e}")
            await asyncio.sleep(1)
        except Exception as e:
            logging.exception(f"Error polling frame for camera {camera_id}: {e}")
            await asyncio.sleep(0.5)
    
    # Clean up task from dict when done
    if camera_id in camera_polling_tasks:
        del camera_polling_tasks[camera_id]


async def broadcast_frame(camera_id: str, frame_data: bytes):
    """Sends frames to WebSocket clients subscribed to a specific camera."""
    to_remove = set()
    global frame_connections

    # Broadcast to specific camera connections
    if camera_id in frame_connections:
        for connection in list(frame_connections[camera_id]):
            try:
                await connection.send_bytes(frame_data)  # Send as raw bytes
            except Exception as e:
                logging.warning(f"Failed to send frame to client on camera {camera_id}: {e}")
                to_remove.add(connection)

    # Remove disconnected clients
    for conn in to_remove:
        for active_camera in list(frame_connections.keys()):
            if conn in frame_connections[active_camera]:
                frame_connections[active_camera].discard(conn)
                if not frame_connections[active_camera]:
                    del frame_connections[active_camera]
                    redis_client.set(
                        f"camera_{active_camera}_websocket_active",
                        "False",
                    )
                    logging.info(f"Removed inactive connection for camera {active_camera}")


# WebSocket for Frames (Per Camera) 
@router.websocket("/ws/frames/{camera_id}")
async def websocket_camera_frames(websocket: WebSocket, camera_id: str):
    """Handles WebSocket connections for video frames from a specific camera."""
    await websocket.accept()

    global frame_connections, camera_polling_tasks
    frame_connections[camera_id].add(websocket)
    
    logging.info(f"Client connected to video frames for camera {camera_id}")
    redis_client.set(f"camera_{camera_id}_websocket_active", "True")

    # Start polling task for this camera if not already running
    if camera_id not in camera_polling_tasks:
        camera_polling_tasks[camera_id] = asyncio.create_task(poll_camera_frame(camera_id))

    try:
        while True:
            try:
                await websocket.receive()
            except WebSocketDisconnect:
                logging.warning(f"Client disconnected from Frame streaming of Camera {camera_id}")
                break
            except WebSocketException as e:
                logging.error(f"WebSocket error for Camera {camera_id}: {e}")
                break
            except Exception as e:
                logging.error(f"Unexpected error for Camera {camera_id}: {e}")
                break
    finally:
        logging.warning(f"Cleaning up WebSocket connection for Camera {camera_id}")
        if camera_id in frame_connections:
            frame_connections[camera_id].discard(websocket)
            if not frame_connections[camera_id]:
                del frame_connections[camera_id]
                redis_client.set(f"camera_{camera_id}_websocket_active", "False")

                # Cancel polling task when no more connections
                if camera_id in camera_polling_tasks:
                    camera_polling_tasks[camera_id].cancel()
                    del camera_polling_tasks[camera_id]


# Function to start frame delivery (now just a placeholder since polling is per-connection)
async def start_redis_frame_listener():
    """
    Polling-based frame delivery is now handled per WebSocket connection.
    This function is kept for backward compatibility with startup code.
    """
    logging.info("Frame delivery system ready (polling-based per connection)")