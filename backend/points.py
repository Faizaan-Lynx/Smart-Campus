import cv2
from dotenv import load_dotenv
load_dotenv(override=True)
import os

cap = cv2.VideoCapture("data/sample2.mp4")
if not cap.isOpened():
    print("Error: Could not open video.")
    exit()

def mouse_click(event, x, y, flags, params):
    global frame
    if event == cv2.EVENT_LBUTTONDOWN:
        frame = cv2.circle(frame, (x,y), 5, (0,0,255), -1)
        points.append((x,y))
        if len(points) >= 2:
            frame = cv2.line(frame, points[-1], points[-2], (0,255,0), 2)
        print(f"({x},{y})")

ret, frame = cap.read()
print(frame.shape)
if not ret:
    print("Error: Could not read frame.")
    exit()

# crop_dims = ((1280, 720), (640+1280, 720+480))
# frame = frame[-960:, -1280:]

resize_dims = eval(os.getenv("FEED_DIMS", "(640,480)"))
frame = cv2.resize(frame, resize_dims)

# displaying the image with cv2
cv2.imshow("Frame", frame)
points = []
cv2.setMouseCallback("Frame", mouse_click)

if cv2.waitKey(0):
    cv2.destroyAllWindows()
cap.release()