from fastapi import WebSocket, WebSocketDisconnect
from typing import Dict, List

class WebSocketManager:
    """Manages WebSocket connections per camera."""
    
    def __init__(self):
        self.active_connections: Dict[int, List[WebSocket]] = {}

    async def connect(self, camera_id: int, websocket: WebSocket):
        """Accepts a WebSocket connection for a given camera ID."""
        await websocket.accept()
        if camera_id not in self.active_connections:
            self.active_connections[camera_id] = []
        self.active_connections[camera_id].append(websocket)

    async def disconnect(self, camera_id: int, websocket: WebSocket):
        """Removes a WebSocket connection."""
        if camera_id in self.active_connections:
            self.active_connections[camera_id].remove(websocket)
            if not self.active_connections[camera_id]:  # Remove if empty
                del self.active_connections[camera_id]

    async def broadcast(self, camera_id: int, message: dict):
        """Broadcasts an alert message to all users watching a specific camera."""
        if camera_id in self.active_connections:
            for ws in self.active_connections[camera_id]:
                try:
                    await ws.send_json(message)
                except WebSocketDisconnect:
                    await self.disconnect(camera_id, ws)

# Create a global instance of WebSocketManager
websocket_manager = WebSocketManager()