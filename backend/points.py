import cv2
from dotenv import load_dotenv
load_dotenv(override=True)
import os

cap = cv2.VideoCapture("rtsp://ncsael:Rawalians1234@172.23.10.180")
if not cap.isOpened():
    print("Error: Could not open video.")
    exit()


while True:
    ret, frame = cap.read()
    if not ret:
        print("Error: Could not read frame.")
        continue

    resize_dims = eval(os.getenv("FEED_DIMS", "(640,480)"))
    frame = cv2.resize(frame, resize_dims)

    # displaying the image with cv2
    cv2.imshow("Frame", frame)

    if cv2.waitKey(0):
        break
cv2.destroyAllWindows()
cap.release()