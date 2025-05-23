import cv2
import time

# rtsp = "rtsp://ncsael:Rawal@1234@172.23.10.83"
# rtsp = "rtsp://ncsael:Rawalians1234@172.23.10.79"
rtsp = "rtsp://ncsael:Rawal09876@172.23.10.91"
cap = cv2.VideoCapture(rtsp, cv2.CAP_FFMPEG)
if not cap.isOpened():
    print("Error: Could not open video.")
    exit()

while True:
    ret, frame = cap.read()
    if not ret:
        print("Error: Could not read frame.")
        continue
    frame = cv2.resize(frame, (640,480))

    cv2.imshow("Frame", frame)

    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

cv2.destroyAllWindows()
cap.release()
