import os
import cv2
import threading
import numpy as np
from ultralytics import YOLO
from fastapi import FastAPI, HTTPException, APIRouter
from core.RealTimeVideoCapture import RealTimeVideoCapture

import time
import datetime
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from dotenv import load_dotenv
load_dotenv(override=True)

router = APIRouter(tags=["IntrusionDetection"])

# ensure emails are valid before using this function
def send_email(sender_email:str, sender_password:str, receiver_emails:list, subject:str, body:str, server:str, port:int=587):
    """
    Sends an email using the SMTP protocol.

    Args:
        sender_email (str): The email address of the sender.
        sender_password (str): The password of the sender's email.
        receiver_email (str): The email address of the receiver.
        subject (str): The subject of the email.
        body (str): The body of the email.
        server (str): The SMTP server address.
        port (int): The port number of the SMTP server.
    """
    try:
        server = smtplib.SMTP_SSL(server, port)
        server.login(sender_email, sender_password)

        msg = MIMEMultipart()
        msg['From'] = sender_email
        msg['To'] = receiver_email
        msg['Subject'] = subject
        msg.attach(MIMEText(body, 'plain'))

        text = msg.as_string()
        for receiver_email in receiver_emails:
            server.sendmail(sender_email, receiver_email, text)
        server.quit()
    except Exception as e:
        print(f"Error: {e}")
        # raise RuntimeError(f"Error: {e}")


def centroid_near_line(centroid_x:float, centroid_y:float, line_point1:tuple, line_point2:tuple, threshold:float=10) -> bool:
    """
    Determines if a centroid has crossed or is near a line defined by two points.

    Parameters:
    centroid_x (float): The x-coordinate of the centroid.
    centroid_y (float): The y-coordinate of the centroid.
    line_point1 (tuple): A tuple representing the first point of the line (x1, y1).
    line_point2 (tuple): A tuple representing the second point of the line (x2, y2).
    threshold (float): The distance threshold within which the centroid is considered near the line.

    Returns:
    bool: True if the centroid is near or has crossed the line, False otherwise.
    """
    # coords for line points
    x1, y1 = line_point1
    x2, y2 = line_point2

    # direction vector of the line segment
    line_vector = np.array([x2 - x1, y2 - y1])
    centroid_vector = np.array([centroid_x - x1, centroid_y - y1])
    line_length = np.linalg.norm(line_vector)
    line_unit_vector = line_vector / line_length

    # projection of the centroid onto the infinite line (normalized)
    projection_length = np.dot(centroid_vector, line_unit_vector)

    if projection_length < 0:
        closest_point = np.array([x1, y1])  # closest to line_point1
    elif projection_length > line_length:
        closest_point = np.array([x2, y2])  # closest to line_point2
    else:
        closest_point = np.array([x1, y1]) + projection_length * line_unit_vector  # closest point on the line segment

    # perpendicular distance from centroid to the closest point on the line segment
    closest_distance = np.linalg.norm(np.array([centroid_x, centroid_y]) - closest_point)

    return closest_distance <= threshold


class IntrusionDetection:
    """
    class IntrusionDetection
    ------------------------
    This class is designed to detect intrusions based on object detection using YOLOv5.

    The primary function is to detect objects in a video feed and determine if any objects cross a line/defined threshold.

    Parameters
    ----------
        video_source (str): Path to a video file or a video feed URL (rtsp/rtmp/http).
        lines (tuple): A tuple of two points defining a line (x1, y1), (x2, y2).
        model_path (str): Path to the YOLOv5 model file.
        intrusion_threshold (int): The distance threshold within which an object is considered to have crossed the line.
        intrusion_flag_duration (int): The number of frames to keep the intrusion flag active after an intrusion is detected.
        capped_fps (bool): If True, caps the frame rate. Set it to true for file playback.
        restart_on_end (bool): If True, restarts video file playback when it ends.
        framerate (int): Frame rate for video file playback (used if capped_fps is True).
        crop (tuple): A tuple of two points defining a crop region (x1, y1), (x2, y2).
        resize (tuple): A tuple of two values defining the resize dimensions (width, height).
        camera_id (int): The camera ID.
        camera_location (str): The location of the camera.
        receiver_emails (list): A list of valid email addresses to send notifications to.
    """

    def __init__(
                    self, video_source:str, lines:tuple, show_line:bool=False, model_path:str="model/yolov8m.pt",
                    intrusion_threshold:int=120, intrusion_flag_duration:int=15, capped_fps:bool=True, restart_on_end:bool=True, 
                    framerate:int=20, crop:tuple=None, resize:tuple=(1280, 720),
                    camera_id:int=0, camera_location:str="Unknown", receiver_emails:list=[]
                ):
        # model and video cap setup
        self.yolo = YOLO(model_path)
        self.cap = RealTimeVideoCapture(video_source, capped_fps=capped_fps, restart_on_end=restart_on_end, framerate=framerate)
        self.camera_id = camera_id
        self.camera_location = camera_location
        self.receiver_emails = receiver_emails

        if not self.cap.isOpened():
            print("Error: Could not access the feed.")
            exit()

        # intrusion detection parameters
        self.show_line = show_line
        self.lines = lines
        self.intrusion_threshold = intrusion_threshold
        self.intrusion_flag_duration = intrusion_flag_duration
        self.intrusion_flag = False

        # crop and resize setup
        self.crop = crop
        self.resize = resize

        # threading setup
        self.stop_event = threading.Event()
        self.thread = threading.Thread(target=self.__intrusion_detection_thread__)
        self.thread.daemon = True
        self.thread.start()


    def __intrusion_detection_thread__(self):
        """
        Continuously reads frames from the video source in a separate thread.
        """

        self.cap.start()
        flag_frame_count = self.intrusion_flag_duration

        while True:
            ret, frame = self.cap.read()
            if not ret:
                continue
            
            if self.crop is not None:
                annotated_frame = frame[self.crop[0][1]:self.crop[1][1], self.crop[0][0]:self.crop[1][0]]
            else:
                annotated_frame = frame

            annotated_frame = cv2.resize(annotated_frame, self.resize)

            results = self.yolo.track(annotated_frame, classes=[0], verbose=False, stream=True, persist=True)

            for res in results:
                if res.boxes.id is None:
                    continue

                for detection in res.boxes:
                    x1, y1, x2, y2 = map(int, detection.xyxy[0])
                    cx = (x1 + x2) / 2
                    cy = (y1 + y2) / 2

                    if centroid_near_line(cx, cy, self.lines[0], self.lines[1], threshold=self.intrusion_threshold):
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 0, 255), 2)
                        self.intrusion_flag = True
                        flag_frame_count = self.intrusion_flag_duration
                    else:
                        cv2.rectangle(annotated_frame, (x1, y1), (x2, y2), (0, 255, 0), 2)

            if self.intrusion_flag and flag_frame_count == self.intrusion_flag_duration:
                email_subject = f"Intrusion Detected at {self.camera_location}"
                email_text = f"An intrusion has been detected at {self.camera_location} on {datetime.datetime.now()}."
                send_email(
                    os.getenv("SMTP_EMAIL"), os.getenv("SMTP_PASSWORD"), self.receiver_emails,
                    email_subject, email_text, os.getenv("SMTP_SERVER"), os.getenv("SMTP_PORT")
                )

            if self.intrusion_flag:
                cv2.putText(annotated_frame, f"INTRUSION DETECTED", (20, 50), cv2.FONT_HERSHEY_SIMPLEX, 2, (0, 0, 255), 4)
                flag_frame_count -= 1
                if flag_frame_count == 0:
                    self.intrusion_flag = False
                    flag_frame_count = self.intrusion_flag_duration
            
            if self.show_line:
                annotated_frame = cv2.line(annotated_frame, self.lines[0], self.lines[1], (0, 0, 255), 2)
            
            cv2.imshow('Intrusion Detection', annotated_frame)

            if cv2.waitKey(1) & 0xFF == ord('q'):
                break

    def stop(self):
        """
        Stops the intrusion detection process.
        """
        self.stop_event.set()
        self.cap.release()
        self.thread.join(2)


# driver code
def main():
    
    # cv2lines = [(950,700),(950,20)]
    cv2lines = [(20,450),(1000,250)]
    # cv2lines = [(300,200),(600,300)]

    intr_det = IntrusionDetection(  
                                    "data/vid4.mp4", cv2lines, show_line=True, capped_fps=True, 
                                    restart_on_end=True, framerate=20, intrusion_threshold=120, 
                                    intrusion_flag_duration=15, resize=(1280, 720), crop=((0,0), (1280,720))
                                )
    while True:
        if cv2.waitKey(1) & 0xFF == ord('q'):
            intr_det.stop()
            break


if __name__ == "__main__":
    main()