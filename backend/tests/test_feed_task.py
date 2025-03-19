import pytest
from core.celery.feed_task import publish_frame

# Test parameters
camera_id = 1
annotated_frame = None  
test_video_path = r"C:\Users\sa\OneDrive\Desktop\Smart-Campus\backend\tests\vid2.mp4"

@pytest.mark.parametrize("camera_id, annotated_frame, video_path", [
    (1, None, test_video_path),  
    (2, None, None),  # Test without a video file
])
def test_publish_frame(camera_id, annotated_frame, video_path):
    result = publish_frame(camera_id, annotated_frame, video_path)
    assert result is not None  # Ensure function returns a valid response
