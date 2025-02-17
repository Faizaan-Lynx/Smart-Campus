import React, { useState, useEffect } from "react";
import "./CCTVCamList.css";
import { localurl } from "../../utils";

const CameraList = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(cameras[0]?.id || "");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (selectedCamera) {
      const img = document.getElementById("camera_feed");
      img.src = `${localurl}/intrusion_feed/${selectedCamera}`;
      setLoading(true);

      img.onload = () => setLoading(false);
      img.onerror = () => setLoading(false);
    }
  }, [selectedCamera]);

  return (
    <div className="camera-feed-container">
      <div className="camera-list">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className={`camera-card ${selectedCamera === camera.id ? "active" : ""}`}
            onClick={() => setSelectedCamera(camera.id)}
          >
            <p>{camera.name}</p>
          </div>
        ))}
      </div>
      <div className="video-feed">
        {loading && <div className="cctv_camera_loader"></div>}
        {/* Display the selected camera ID */}
        <h1>{selectedCamera}</h1>
        <img
          className={`camera__feed__image ${loading ? "hidden" : ""}`}
          id="camera_feed"
          alt="Video Stream"
        />
      </div>
    </div>
  );
};

export default CameraList;
