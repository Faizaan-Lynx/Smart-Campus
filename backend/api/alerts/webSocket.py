from fastapi import WebSocket, WebSocketDisconnect
import redis
import json
import asyncio

# Redis client for subscribing to alert messages
redis_client = redis.Redis(host="redis", port=6379, db=0)
pubsub = redis_client.pubsub()
pubsub.subscribe("alerts_channel")

active_connections = set()

async def redis_listener():
    """Continuously listens for messages on the Redis pub/sub channel."""
    while True:
        message = pubsub.get_message(timeout=1.0)
        if message and message["type"] == "message":
            alert_data = message["data"].decode("utf-8")
            await broadcast_alert(alert_data)
        await asyncio.sleep(0.5)

async def broadcast_alert(alert_data: str):
    """Sends alert messages to all active WebSocket clients."""
    for connection in active_connections:
        try:
            await connection.send_text(alert_data)
        except:
            active_connections.remove(connection)

async def websocket_alerts(websocket: WebSocket):
    """Handles WebSocket connections for live alerts."""
    await websocket.accept()
    active_connections.add(websocket)

    try:
        while True:
            await websocket.receive_text()  # Keep connection alive
    except WebSocketDisconnect:
        active_connections.remove(websocket)
