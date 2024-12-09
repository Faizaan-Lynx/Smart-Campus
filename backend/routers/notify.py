from fastapi import APIRouter, WebSocket
from core import utils
import psycopg2
import asyncio
import time
from typing import List
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
import threading
from core import utils
import psycopg2
import asyncio
import time
import json

router = APIRouter()
clients: List[WebSocket] = []

async def notify_clients(message: str):
    if not clients:
        print("\nNo clients connected to notify.\n")
    for client in clients:
        await client.send_text(message)
    
    print("\nmessage sent to all clients\n")
        
def notification_listener():
    connection = utils.connection
    connection.set_isolation_level(psycopg2.extensions.ISOLATION_LEVEL_AUTOCOMMIT)
    
    try:
        cursor = connection.cursor()
        cursor.execute("LISTEN new_row;")
        cursor.execute("LISTEN time_out_update")
        cursor.execute("LISTEN is_new_update;")
        print("Listening for notifications on 'new_row', 'time_out_update' and 'is_new_update' channels...")

        while True:
            connection.poll()
            while connection.notifies:
                notification = connection.notifies.pop(0)
                message = notification.payload
                message_object = json.loads(message)
                print(f"Channel: {notification.channel}")
                print(f"\n{message_object}\n")
                print(notification.channel)

                if(notification.channel == "is_new_update"):
                    message_object["updated_is_new"] = True
                else:
                    message_object["updated_is_new"] = False

                asyncio.run(notify_clients(json.dumps(message_object)))
            time.sleep(0.05)

    except Exception as e:
        print(f"\n\n\nError occurred while listening for notifications: {e}\n\n\n")
    finally:
        cursor.close()
        connection.close()


def listen_to_notifications():
    listener_thread = threading.Thread(target=notification_listener, args=())
    listener_thread.start()

    print("\nNotification listener thread started successfully.\n")
    

@router.websocket("/websocket")
async def websocket_endpoint(websocket: WebSocket):
    await websocket.accept()
    clients.append(websocket)
    try:
        while True:
            # This is just to keep the connection alive
            await websocket.receive_text() 
    except WebSocketDisconnect:
        clients.remove(websocket)