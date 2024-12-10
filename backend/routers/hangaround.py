import threading
import asyncio
from threading import Thread
from fastapi import Depends, APIRouter, HTTPException, Request
from sqlmodel import Session, select
from models import Guest, Site, User, Visit
from core import crud, utils
from fastapi.responses import StreamingResponse
from ultralytics.utils.plotting import save_one_box
from ultralytics import YOLO
import numpy as np
import cv2
import time
# New imports
import sys
import matplotlib.path
from queue import Queue

from dotenv import load_dotenv
load_dotenv()

router = APIRouter(tags=["hangAround"])

# thread-safe queues for exchanging input/output frames between threads
unprocessed_frame_queue = Queue(maxsize=1)
processed_frame_queue = Queue(maxsize=1)

# thread running/lock
running = True

class Hangaround_Tracker:
  def __init__(self,):
    # defines polygon for region of interest, first and last point should be identical to close the polygon 
    self.roi = np.array([(200, 200), (200, 500), (500, 500), (500, 200)])
    self.roi_perimeter = matplotlib.path.Path(self.roi)
    self.roi = self.roi.reshape((-1, 1, 2))
    
    self.entry_times = {}
    self.total_hangaround_time = 0
    self.exit_count = 0
    self.avg_hangaround_time = 0
    self.min_hangaround_time = 0
    self.max_hangaround_time = 0
    
    # get input stream
    # self.rtmp_url = os.getenv('INPUT_STREAM')
    # self.capture = cv2.VideoCapture(rtmp_url)
    self.rtmp_url = 'rtmp://vtmsgpzl.ezvizlife.com:1935/v3/openlive/K57001616_1_1?expire=1721956824&id=736498074432143360&c=9ada396462&t=636095888ba60fe62e84cc507cde7682d8993f778782bacaadee71c7d203f554&ev=100'
    self.capture = cv2.VideoCapture(self.rtmp_url)

    # check if capture opened
    if not self.capture.isOpened():
      print("Error: failed to load live feed")
      # raise exception here pls


    # output window size
    self.window_width = 800
    self.window_height = 600

    # load yolo nano model
    self.yolo = YOLO()
    self.yolo_thread = None

    self.capture_frame_thread = None


  # destructor
  def __del__(self):
    self.capture.release()
    cv2.destroyAllWindows()
    
  # create threads for managing main processes - 1) get unprocessed frames - 2) process those frames
  def start_tracking(self):
    self.running = True

    # put unprocessed frames in queue - thread
    self.capture_frame_thread = Thread(target=self.capture_frame_func,)
    self.capture_frame_thread.daemon = True
    self.capture_frame_thread.start()

    # get unprocessed frames and process them
    self.yolo_thread = threading.Thread(target=self.yolo_thread_func,args=(self.yolo,), daemon=True)
    self.yolo_thread.daemon = True
    self.yolo_thread.start()

  # puts unprocessed frames into queue
  def capture_frame_func(self):
    while True:
      success, frame = self.capture.read()

      # possibly replace with try/except block
      if not success:
        self.capture.open(self.rtmp_url)
        print("frame not read successfully. retrying")
        continue

      if frame is None:
        continue

      frame = cv2.resize(frame, (self.window_width, self.window_height))

      try: 
        unprocessed_frame_queue.put(frame)
      except Exception as e:
        print(f"Exception raised: {e}")
        continue

  # separate thread function for yolo functionality
  def yolo_thread_func(self, yolo: YOLO):
    global running, hangaround_time

    while True:
      # draw bounding boxes for detected objects
      if running is False:
        sys.exit()
      
      try:
        frame = unprocessed_frame_queue.get()
      except:
        print("Queue Empty. Waiting for new frames")
        continue

      # detect objs (class 0 == persons only) in frame
      results = yolo.track(frame, classes=[0], verbose=False, stream=True)

      for res in results:
        frame = res.plot()

        for detection in res.boxes:          
          # coordinates of the bounding box
          x_center, y_center, _, _ = map(int, detection.xywh[0])
          
          # id of the detections
          if detection.id is not None:
            track_id = int(detection.id[0])
            self.avg_hangaround_time = self.calculate_hangaround_time(track_id, x_center, y_center)

      # draw roi - delete in final
      cv2.polylines(frame, [self.roi], isClosed=True, color=(255, 0, 0), thickness=2)
      
      # display hangaround time on top left
      cv2.putText(frame, f"Average Hangaround Time: {self.avg_hangaround_time:.2f}", (10, 50), cv2.FONT_HERSHEY_SIMPLEX, 1, (0, 0, 255), 2)

      # finally, output the processed frame  
      try:
        processed_frame_queue.put(frame)
      except:
        print("Processed Frames Queue Full. Waiting for space")
        continue 


  # function to calculate hangaround time
  def calculate_hangaround_time(self, track_id, x_center, y_center):
    
    # Check if person is in the RoI, add to entry times
    if self.roi_perimeter.contains_point((x_center, y_center)):
      if track_id not in self.entry_times:
        self.entry_times[track_id] = time.time()
    else:
      # If a person in entry times dict is no longer in RoI, add to total hangaround time, remove from entry times
      if track_id in self.entry_times:
        exit_time = time.time()
        current_hang = exit_time - self.entry_times[track_id]
        self.total_hangaround_time += current_hang
        
        if current_hang > self.max_hangaround_time:
          self.max_hangaround_time = current_hang
        elif current_hang < self.min_hangaround_time:
          self.min_hangaround_time = current_hang

        self.exit_count += 1
        del self.entry_times[track_id]

    # Calculate average hangaround time
    if self.exit_count > 0:
      average_hangaround_time = self.total_hangaround_time / self.exit_count
    else:
      average_hangaround_time = 0
    return average_hangaround_time

## ===== end of class ===== ##

hangaround_tracker = Hangaround_Tracker()
async def create_stream():
  ## initialize everything
  
  hangaround_tracker.start_tracking()

  try:
    while running:
      # if await request.is_disconnected():
      #     break
      
      try:
        frame = processed_frame_queue.get()
        # cv2.imshow("live feed", frame)
        # print("frame get")
      except Exception as e:
        print(f"Error in processed frame retrieval: {e}")
        continue

      ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 20])
      if not ret:
        continue
      frame = jpeg.tobytes()
      yield (b'--frame\r\n'
        b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
      
      await asyncio.sleep(0.05)
    
    print("streaming loop ended.")
  except Exception as e:
    print(f"Error in frame streaming: {e}")

@router.get("/hangaround__feed/{site_id}")
async def video_feed(site_id: int, 
                      session: Session = Depends(utils.get_session)
                    ):
    if site_id:
      return StreamingResponse(create_stream(),
        media_type="multipart/x-mixed-replace; boundary=frame")
        
    else:
      db_site = session.get(Site, site_id)
      if not db_site:
        raise HTTPException(status_code=404, detail="Site not found")

@router.get("/hangaround__time/{site_id}")
def get_hang_time():

  return  [
            hangaround_tracker.avg_hangaround_time,
            hangaround_tracker.min_hangaround_time,
            hangaround_tracker.max_hangaround_time
          ]
