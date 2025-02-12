import threading

from datetime import datetime
from fastapi import Depends, APIRouter, HTTPException, Request
from sqlmodel import Session, select
from models import Guest, Site, User, Visit
from core import crud, utils
from collections import deque
from fastapi.responses import StreamingResponse
from collections import defaultdict
from ultralytics.utils.plotting import save_one_box
from deepface import DeepFace
from ultralytics import YOLO
from ultralytics.utils import LOGGER
from typing import Annotated
from shapely.geometry import Point, LineString
import numpy as np
import cv2
import time

router = APIRouter(tags=["Stream"])

class Tracker:
    def __init__(self, model, site_id, link, protocol, session, sensitivity, fps, threshold, rotation, reg_pts, crop_area):
        self.model = model
        self.site_id = site_id
        self.link = link
        self.protocol = protocol
        self.session = session
        self.sensitivity = sensitivity
        self.fps = fps
        self.threshold = 15 if threshold is None else threshold
        self.rotation = 0 if rotation is None else rotation
        # self.reg_pts = [(1350, 240), (1700, 210)] if reg_pts is None else reg_pts
        self.reg_pts = [(160, 250), (500, 250)] if reg_pts is None else reg_pts
        # self.crop_area = [1180,0,2000,600]
        # self.crop_frames = True
        self.crop_area = crop_area
        self.crop_frames = False if crop_area is None else True
        # self.start_x = 1180
        # self.start_y = 0
        # self.end_x = 2000
        # self.end_y = 600
        
        self.frame_buffer = deque(maxlen=4)
        self.stop_tracking = False
        self.max_det = 15
        self.conf = 0.3
        self.track_history = defaultdict(list)
        self.count_ids = []
        self.visits = []
        
        self.counting_region = LineString(self.reg_pts)
        self.reconnect_attempt_counter = 0
        self.maximum_reconnect_attempts = 2        
        self.video = cv2.VideoCapture(self.link)
        
        if self.video.isOpened():
            LOGGER.info(f"\nSuccessfully connected to {self.link} ✅ \n")
            self.tracker_thread = threading.Thread(target=self.run_tracker_in_thread_v1, args=())
            self.tracker_thread.start()
        else:
            LOGGER.info(f"\nCould'nt connect to the site \u274c \n")
            self.stop_tracking = True
    
    def run_tracker_in_thread_v1(self):
        print("Thread Started")
        
        while not self.stop_tracking:
            if not self.video.isOpened():
                self.get_fresh_url()
                self.attempt_reconnect()
                continue
            try:
                self.video.grab()
                success, frame = self.video.retrieve()
                
                if not success:
                    LOGGER.warning("WARNING ⚠️ Video stream unresponsive, please check your IP camera connection.")
                    self.video.open(self.link)
                    continue
                
                if frame is None:
                    continue
                
                source_frame = frame
                if self.crop_frames:
                    start_x, start_y, end_x, end_y = self.crop_area
                    source_frame = frame[start_y:end_y, start_x:end_x]

                if self.rotation != 0:
                    source_frame = self.rotate_frame(source_frame, self.rotation)
                
                detections = self.model.track(
                    source=source_frame,
                    stream=True,
                    persist=True,
                    max_det=self.max_det,
                    conf=self.conf,
                    # stream_buffer=True,
                    classes=[0],
                    # show=True,
                    show_labels=False,
                    line_width=1,
                    verbose=False
                )
                
                for result in detections:
                    r_frame = result.plot()
                    
                    if(result.boxes):
                        self.snap_on_in(result, r_frame)
                    else:
                        pass
                    
                    self.reconnect_attempt_counter = 0
                    self.frame_buffer.append(r_frame)
            except Exception as e:
                print(str(e))
                self.attempt_reconnect()
                    
        self.stop_tracking = True
        if self.site_id in utils.trackers:
            del utils.trackers[self.site_id]      
    
    def get_fresh_url(self):
        if self.reconnect_attempt_counter == 0:
            try:
                db_site = self.session.get(Site, self.site_id)
                if not db_site:
                    raise HTTPException(status_code=404, detail="Site not found")
                key = utils.get_key()
                fresh_url = utils.get_feed_url(key, db_site.in_camera, protocol=self.protocol)
                
                if fresh_url:
                    db_site.in_url = fresh_url
                    self.session.add(db_site)
                    self.session.commit()
                    self.link = fresh_url
                    print(db_site.in_url)
            except:
                print("failed to fetch fresh url \u274c \n")
    
    def rotate_frame(self, frame, angle):
        height, width = frame.shape[:2]

        rotation_matrix = cv2.getRotationMatrix2D((width / 2, height / 2), angle, 1)
        frame = cv2.warpAffine(frame, rotation_matrix, (width, height))
        return frame
    
    def attempt_reconnect(self):
        self.reconnect_attempt_counter += 1
        
        if self.reconnect_attempt_counter > self.maximum_reconnect_attempts:
            self.stop_tracking = True
            return
        
        print("Waiting...")
        time.sleep(3)
        print("Attempting to reconnect...")
        self.video.open(self.link)
        
        if self.video.isOpened():
            LOGGER.info(f"\nSuccessfully connected to {self.link} ✅ \n")

    def snap_on_in(self, results, frame):
        cv2.polylines(frame, [np.array(self.reg_pts, dtype=np.int32)], isClosed=True, color=(0, 230, 0), thickness=2)
        
        boxes = results.boxes.xywh.cpu()
        xyxys = results.boxes.xyxy.cpu()        
        if results.boxes.id is None:
            return
        track_ids = results.boxes.id.int().cpu().tolist()

        for box, track_id, xyxy in zip(boxes, track_ids, xyxys):
            x, y, _, _ = box

            track_line = self.track_history[track_id]
            track_line.append((float(x), float(y)))  
            if len(track_line) > 30:
                track_line.pop(0)
                
            points = np.hstack(track_line).astype(np.int32).reshape((-1, 1, 2))
            cv2.polylines(frame, [points], isClosed=False, color=(230, 230, 230), thickness=10)

            prev_position = self.track_history[track_id][-2] if len(self.track_history[track_id]) > 1 else None
            mov = [c[1] for c in track_line]
            dir = y - np.mean(mov)

            # is_inside = self.counting_region.contains(Point(track_line[-1]))

            # if prev_position is not None and is_inside and track_id not in self.count_ids:
            if prev_position is not None and track_id not in self.count_ids:
                distance = Point(track_line[-1]).distance(self.counting_region)
                if distance < self.threshold and track_id not in self.count_ids:
                    # print(f"{track_id} {'in' if dir>0 else 'out'}")
                    self.count_ids.append(track_id)
                    now = datetime.now()
                    visit = {}

                    if dir > 0:
                        visit["site_id"] = self.site_id
                        visit["ts"] = time.time()
                        visit["date_in"] = now.strftime("%Y-%m-%d")
                        visit["time_in"] = now.strftime("%H:%M")

                        if self.visits:
                            diff = abs(visit["ts"] - self.visits[-1]["ts"])
                            visit["is_group"] = True if diff < self.sensitivity else False

                        pers = save_one_box(
                            xyxy, 
                            results.orig_img.copy(),
                            # Path(f"cls/{track_id}.jpg"), 
                            BGR=True,
                            save=False,
                        )                        
                        visit["is_female"] = self.get_gender(pers)
                        # web socket call.....
                        print(visit)
                        self.visits.append(visit)
                        db_visit = Visit(**visit)
                        self.session.add(db_visit)
                        self.session.commit()

                        visit_vector = self.get_vector(pers)                        
                        v0 = np.array(visit_vector)
                        # repeat customers where date is not today will be more efficient.
                        q2 = select(Guest.id, Guest.vector).filter(Guest.site_id == self.site_id)
                        db_data = self.session.exec(q2).all()
                        if not db_data:
                            print(f"adding first guest entry: {track_id}")                     
                            guest = {}
                            guest["name"] = track_id
                            guest["vector"] = ",".join(str(x) for x in visit_vector)
                            guest["site_id"] = self.site_id
                            db_guest = Guest(**guest)
                            self.session.add(db_guest)
                            self.session.commit()
                        else:
                            dists = (0, 2)
                            for db_id, db_vector in db_data:
                                v = [float(x) for x in db_vector.split(",")]
                                v1 = np.array(v)

                                if len(v0) == len(v1):
                                    a = np.matmul(np.transpose(v0), v1)
                                    b = np.sum(np.multiply(v0, v0))
                                    c = np.sum(np.multiply(v1, v1))
                                    dist = 1 - (a / (np.sqrt(b) * np.sqrt(c)))
                                    # print("="*50)
                                    # print(f"dist with {db_id}: {dist}")
                                    
                                    if dist < dists[1]:
                                        dists = (db_id, dist)
                            
                            if dists[1] <= 0.593:
                                match = dists[0]
                                # print("="*50)
                                print(f"match found at id {match}")
                                extra_in_data = {"guest_id": match,
                                "is_new": False}
                                db_visit.sqlmodel_update(db_visit, update=extra_in_data)
                                self.session.add(db_visit)
                                self.session.commit()
                            else:
                                # print("="*50)
                                print(f"adding new guest entry: {track_id}")                     
                                guest = {}
                                guest["name"] = track_id
                                guest["vector"] = ",".join(str(x) for x in visit_vector)
                                guest["site_id"] = self.site_id
                                db_guest = Guest(**guest)
                                self.session.add(db_guest)
                                self.session.commit()
                    elif dir < 0:
                        if self.count_ids:
                            self.count_ids.pop(0)
                        
                        now = datetime.now()
                        today = now.strftime("%Y-%m-%d")
                        
                        # query = select(Visit).filter(Visit.site_id == self.site_id, Visit.time_out == None).order_by(Visit.date_in, Visit.time_in)
                        query = select(Visit).filter(Visit.site_id == self.site_id, Visit.date_in==today, Visit.time_out == None).order_by(Visit.time_in)
                        fifo_visit = self.session.exec(query).first()
                        if fifo_visit:
                            print(f"Time_out Update on : {fifo_visit}")
                            extra_out_data = {"time_out": now.strftime("%H:%M")}
                            fifo_visit.sqlmodel_update(fifo_visit, update=extra_out_data)
                            self.session.add(fifo_visit)
                            self.session.commit()
    
    def get_gender(self, pers):
        pers_gs = DeepFace.analyze(
            pers,
            actions=['gender'],
            enforce_detection=False,
            detector_backend='yolov8',
            # expand_percentage=10,
            silent=True
        )
        
        if pers_gs:
            return True if pers_gs[0]['gender']['Woman'] > 20 else False
        return None
    
    def get_vector(self, pers):
        pers_vs = DeepFace.represent(
            pers,
            model_name='SFace',
            enforce_detection=False,
            detector_backend='yolov8',
            # expand_percentage=10,
        )

        if pers_vs:
            return pers_vs[0]['embedding']
        return ""


async def create_stream(tracker: Tracker, request: Request):
    try:
        while not tracker.stop_tracking:
            if await request.is_disconnected():
                break
            
            if tracker.stop_tracking:
                break
            
            if tracker.frame_buffer:
                frame = tracker.frame_buffer[-1]
                ret, jpeg = cv2.imencode('.jpg', frame, [cv2.IMWRITE_JPEG_QUALITY, 20])
                if not ret:
                    continue
                frame = jpeg.tobytes()
                yield (b'--frame\r\n'
                    b'Content-Type: image/jpeg\r\n\r\n' + frame + b'\r\n\r\n')
            time.sleep(0.05)
        
        print("streaming loop ended.")
    except Exception as e:
        print(f"Error in frame streaming: {e}")

@router.get("/video_feed/{site_id}")
async def video_feed(site_id: int, 
                    request: Request,
                    session: Session = Depends(utils.get_session)
                    ):
    if site_id in utils.trackers:
        return StreamingResponse(create_stream(utils.trackers[site_id], request),
            media_type="multipart/x-mixed-replace; boundary=frame")
        
    else:
        db_site = session.get(Site, site_id)
        if not db_site:
            raise HTTPException(status_code=404, detail="Site not found")
        
        # see if you want a fresh in_url here? Give protocol argument also

        reg_pts_e = eval(db_site.reg_pts) if db_site.reg_pts else None
        if db_site.crop_area:
            crop_area_e = [int(x) for x in db_site.crop_area.split(",")]
        else:
            crop_area_e = None
        
        if(db_site.in_url):
            model = YOLO("yolov8s.pt")
            tracker = Tracker(
                model=model, 
                site_id=site_id, 
                link=db_site.in_url,
                protocol=db_site.protocol,
                session=session, 
                sensitivity=db_site.sensitivity, 
                fps = db_site.fps,
                threshold = db_site.threshold,
                rotation = db_site.rotation,
                reg_pts = reg_pts_e,
                crop_area = crop_area_e
                )
            
            if tracker.stop_tracking:
                raise HTTPException(status_code=404, detail="The url is down")

            utils.trackers[site_id] = tracker
            return StreamingResponse(create_stream(tracker, request),
                media_type="multipart/x-mixed-replace; boundary=frame")

@router.post("/stop_tracking/{site_id}")
def stop_stream(*,
                site_id: int,
                session: Session = Depends(utils.get_session),
                current_user: Annotated[User, Depends(crud.get_current_super_user)]
                ):
    db_site = crud.get_current_site(session, current_user, site_id)
    if db_site:
        try:
            utils.trackers[db_site.id].stop_tracking = True
            utils.trackers[db_site.id].tracker_thread.join()

            return {"message": "Site Tracking Closed!"}
        except:
            raise HTTPException(status_code=404, detail="model already stopped.")
    else:
        raise HTTPException(status_code=404, detail="Site not found.")