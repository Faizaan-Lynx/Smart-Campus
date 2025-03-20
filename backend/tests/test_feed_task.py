import pytest
import json
import base64
import redis
import cv2
import numpy as np
from time import sleep
from backend.core.celery.feed_task import publish_frame

# Provide a test video file path (Ensure the path is correct)
test_video_path = r"backend\tests\vid2.mp4"

# Call the function asynchronously
result = publish_frame.delay(camera_id=1, annotated_frame=None, test_video_path=test_video_path)

# Wait for the result
print("Task ID:", result.id)
print("Waiting for result...")

# Get result (blocking)
output = result.get(timeout=30)
print("Function Output:", output)
