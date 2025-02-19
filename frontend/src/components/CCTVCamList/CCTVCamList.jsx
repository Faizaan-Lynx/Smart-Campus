import React, { useState, useEffect } from "react";
import { localurl } from "../../utils";
import "./CCTVCamList.css";

const CameraList = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(cameras[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [popupActive, setPopupActive] = useState(false);

  useEffect(() => {
    if (selectedCamera) {
      const img = document.getElementById("camera_feed");
      img.src = `${localurl}/intrusion_feed/${selectedCamera}`;
      setLoading(true);

      img.onload = () => setLoading(false);
      img.onerror = () => setLoading(false);
    }
  }, [selectedCamera]);

  const handleImageClick = () => {
    setPopupActive(true);
    setLoading(true); // Ensure loader appears before fetching image
    const popupImg = document.getElementById("camera_feed_popup");
    popupImg.src = `${localurl}/intrusion_feed/${selectedCamera}`;

    popupImg.onload = () => setLoading(false);
    popupImg.onerror = () => setLoading(false);
  };

  const handleClosePopup = () => {
    setPopupActive(false);
    setLoading(false);
  };

  return (
    <div className="camera-feed-container">
      <div className="camera-list">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className={`camera-card ${
              selectedCamera === camera.id ? "active" : ""
            }`}
            onClick={() => setSelectedCamera(camera.id)}
          >
            <p>{camera.name}</p>
          </div>
        ))}
      </div>
      <div className="video-feed" onClick={handleImageClick}>
        {loading && <div className="cctv_camera_loader"></div>}
        <h1>{selectedCamera}</h1>
        <div className="video__container">
          <img
            className={`camera__feed__image ${loading ? "hidden" : ""}`}
            id="camera_feed"
            alt="Video Stream"
          />
        </div>
      </div>

      {/* Popup Modal */}
      <div className={`cctv-popup-container ${popupActive ? "active" : ""}`}>
        <div className="cctv-popup-content">
          <button className="cctv-popup-close-btn" onClick={handleClosePopup}>
            X
          </button>
          {loading && <div className="cctv_popup_loader"></div>}
          <img
            className={`camera__feed__image ${loading ? "hidden" : ""}`}
            id="camera_feed_popup"
            alt="Video Stream"
          />
        </div>
      </div>
    </div>
  );
};

export default CameraList;
