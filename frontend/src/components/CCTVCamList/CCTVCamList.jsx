import React, { useState, useEffect, useRef } from "react";
import "./CCTVCamList.css";

const CameraList = ({ cameras, selectedCamera, setSelectedCamera }) => {
  const [popupActive, setPopupActive] = useState(false);
  const [imageSrc, setImageSrc] = useState(null); // Stores received image
  const [ws, setWs] = useState(null); // WebSocket instance
  const imgRef = useRef(null);

  // WebSocket Connection on Camera Selection
  useEffect(() => {
    if (!selectedCamera) return;

    const socket = new WebSocket(`ws://localhost:8000/ws/frames/${selectedCamera}`);

    socket.onopen = () => console.log(`Connected to WebSocket for Camera ${selectedCamera}`);
    
    socket.onmessage = (event) => {
      const imageBlob = new Blob([event.data], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      setImageSrc(imageUrl);
    };

    socket.onerror = (error) => console.error("WebSocket Error:", error);
    
    socket.onclose = () => console.log(`Disconnected from WebSocket for Camera ${selectedCamera}`);

    setWs(socket);

    return () => {
      socket.close(); // Cleanup WebSocket on unmount
      setImageSrc(null);
    };
  }, [selectedCamera]);

  // Handle Popup
  const handleImageClick = () => setPopupActive(true);
  const handleClosePopup = () => setPopupActive(false);

  return (
    <div className="camera-feed-container">
      {/* Camera List */}
      <div className="camera-list">
        {cameras
          .sort((a, b) => a.id - b.id)
          .map((camera) => (
          <div
            key={camera.id}
            className={`camera-card ${selectedCamera === camera.id ? "active" : ""}`}
            onClick={() => setSelectedCamera(camera.id)}
          >
            <p>Camera {camera.id}</p>
          </div>
        ))}
      </div>

      {/* Video Feed */}
      <div className="video-feed" onClick={handleImageClick}>
        {imageSrc ? (
          <img className="camera__feed__image" src={imageSrc} alt="Live Stream" ref={imgRef} />
        ) : (
          <p>No feed available</p>
        )}
      </div>

      {/* Popup for Full-Screen View */}
      {popupActive && (
        <div className="cctv-popup-container active">
          <div className="cctv-popup-content">
            <button className="cctv-popup-close-btn" onClick={handleClosePopup}>X</button>
            <img className="camera__feed_popup" src={imageSrc} alt="Live Stream Popup" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraList;
