import cv2

# Replace with your IP camera stream URL
# Example: "http://192.168.1.100:8080/video" or RTSP: "rtsp://user:pass@192.168.1.100:554/stream"
stream_url = "rtsp://ncsael:Rawalians1234@172.23.10.137"

# Open the video stream
cap = cv2.VideoCapture(stream_url)

if not cap.isOpened():
    print("Error: Could not open video stream.")
    exit()

print("Streaming started... Press 'q' to quit.")

while True:
    ret, frame = cap.read()
    if not ret:
        print("Failed to retrieve frame. Exiting...")
        break

    # Display the resulting frame
    cv2.imshow('IP Camera Stream', frame)

    # Exit on pressing 'q'
    if cv2.waitKey(1) & 0xFF == ord('q'):
        break

# Release the video capture object and close display window
cap.release()
cv2.destroyAllWindows()
