import cv2

# IP camera stream URL (RTSP example)
stream_url = "rtsp://ncsael:Rawalians1234@172.23.10.75"

# Try to open the video stream
cap = cv2.VideoCapture(stream_url)

if not cap.isOpened():
    print("❌ Error: Could not open video stream.")
    exit()

print("✅ Streaming started... Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("⚠️ Warning: Failed to retrieve frame.")
        break

    # Display the frame
    cv2.imshow('IP Camera Stream', frame)

    # Press 'q' to quit
    if cv2.waitKey(1) & 0xFF == ord('q'):
        print("⏹ Quitting stream.")
        break

# Cleanup
cap.release()
cv2.destroyAllWindows()
