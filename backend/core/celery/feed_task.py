from celery import shared_task
import redis
import json
import base64
import cv2
import numpy as np
import logging

# Redis client for pub/sub
redis_client = redis.Redis(host="redis", port=6379, db=0, decode_responses=True)

@shared_task(name="core.celery.frame_tasks.publish_frame")
def publish_frame(camera_id: int, annotated_frame, test_video_path: str = None):
    logging.info(f"Received task to publish frame for camera_id: {camera_id}")

    try:
        if test_video_path:
            logging.info(f"Opening test video file: {test_video_path}")
            cap = cv2.VideoCapture(test_video_path)

            if not cap.isOpened():
                logging.error(f"Failed to open test video file: {test_video_path}")
                return {"error": f"Failed to open test video file: {test_video_path}"}

            logging.info("Processing test video frames...")
            while cap.isOpened():
                ret, frame = cap.read()
                if not ret:
                    logging.info("End of video reached.")
                    break  # Stop if video ends
                
                logging.debug("Encoding frame to Base64...")
                _, buffer = cv2.imencode(".jpg", frame)
                frame_base64 = base64.b64encode(buffer).decode("utf-8")

                frame_data = {"camera_id": camera_id, "frame": frame_base64}
                channel = f"camera_frames:{camera_id}"
                redis_client.publish(channel, json.dumps(frame_data))
                logging.info(f"Published frame to Redis channel: {channel}")

            cap.release()
            logging.info("Test video streaming completed.")
            return {"status": "Test video streaming completed"}

        # ======== ORIGINAL CODE ========  
        if annotated_frame is None:
            logging.warning("No frame provided for publishing.")
            return {"error": "No frame provided"}
        
        logging.debug("Encoding annotated frame to Base64...")
        _, buffer = cv2.imencode(".jpg", np.array(annotated_frame))
        frame_base64 = base64.b64encode(buffer).decode("utf-8")

        frame_data = {"camera_id": camera_id, "frame": frame_base64}
        channel = f"camera_frames:{camera_id}"
        redis_client.publish(channel, json.dumps(frame_data))
        logging.info(f"Published annotated frame to Redis channel: {channel}")

        return {"status": "Frame published successfully"}
    
    except Exception as e:
        logging.exception("Failed to publish frame.")
        return {"error": "Failed to publish frame"}
