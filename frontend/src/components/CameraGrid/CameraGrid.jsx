import React, { useState, useEffect, useRef } from "react";
import "./CameraGrid.css";
import BACKEND_URL from '../../config.js';

const CameraGrid = ({ cameras, selectedCamera, setSelectedCamera }) => {
  const [imageSrcs, setImageSrcs] = useState({});
  const [wsConnections, setWsConnections] = useState({});
  const [popupActive, setPopupActive] = useState(false);
  const [popupCameraId, setPopupCameraId] = useState(null);
  const [popupImageSrc, setPopupImageSrc] = useState(null);
  const popupWsRef = useRef(null);

  // WebSocket connections for all cameras (for grid thumbnails)
  useEffect(() => {
    if (!cameras || cameras.length === 0) return;

    const newWsConnections = {};

    cameras.forEach((camera) => {
      const socket = new WebSocket(`ws://${BACKEND_URL}/ws/frames/${camera.id}`);
      socket.onopen = () => console.log(`Connected to WebSocket for Camera ${camera.id}`);
      socket.onmessage = (event) => {
        const imageBlob = new Blob([event.data], { type: "image/jpeg" });
        const imageUrl = URL.createObjectURL(imageBlob);
        setImageSrcs((prev) => ({ ...prev, [camera.id]: imageUrl }));
      };
      socket.onerror = (error) => console.error(`WebSocket Error for Camera ${camera.id}:`, error);
      socket.onclose = () => console.log(`Disconnected from WebSocket for Camera ${camera.id}`);
      newWsConnections[camera.id] = socket;
    });

    setWsConnections(newWsConnections);

    return () => {
      Object.values(newWsConnections).forEach((socket) => socket.close());
    };
  }, [cameras]);

  // Handle popup for full-screen view (live stream)
  useEffect(() => {
    if (!popupActive || !popupCameraId) return;
    // Open a new WebSocket for the popup
    const socket = new WebSocket(`ws://${BACKEND_URL}/ws/frames/${popupCameraId}`);
    popupWsRef.current = socket;
    socket.onopen = () => console.log(`Popup WS connected for Camera ${popupCameraId}`);
    socket.onmessage = (event) => {
      const imageBlob = new Blob([event.data], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      setPopupImageSrc(imageUrl);
    };
    socket.onerror = (error) => console.error(`Popup WS error for Camera ${popupCameraId}:`, error);
    socket.onclose = () => console.log(`Popup WS closed for Camera ${popupCameraId}`);
    return () => {
      socket.close();
      setPopupImageSrc(null);
    };
  }, [popupActive, popupCameraId]);

  const handleImageClick = (cameraId) => {
    setPopupCameraId(cameraId);
    setPopupActive(true);
  };

  const handleClosePopup = () => {
    setPopupActive(false);
    setPopupCameraId(null);
    setPopupImageSrc(null);
    if (popupWsRef.current) {
      popupWsRef.current.close();
      popupWsRef.current = null;
    }
  };

  // Create a 7x7 grid, filling available cameras
  const createGrid = () => {
    const grid = [];
    for (let i = 0; i < 7; i++) {
      const row = [];
      for (let j = 0; j < 7; j++) {
        const cameraIndex = i * 7 + j;
        const camera = cameras[cameraIndex];
        if (camera) {
          row.push(
            <div
              key={camera.id}
              className={`grid-cell ${selectedCamera === camera.id ? 'active' : ''}`}
              onClick={() => setSelectedCamera(camera.id)}
            >
              <div className="camera-label">Camera {camera.id}</div>
              <div className="camera-feed" onClick={(e) => e.stopPropagation()}>
                {imageSrcs[camera.id] ? (
                  <img
                    src={imageSrcs[camera.id]}
                    alt={`Camera ${camera.id}`}
                    onClick={() => handleImageClick(camera.id)}
                  />
                ) : (
                  <div className="loader"></div>
                )}
              </div>
            </div>
          );
        } else {
          row.push(
            <div key={`empty-${i}-${j}`} className="grid-cell empty">
              <div className="empty-label">No Camera</div>
            </div>
          );
        }
      }
      grid.push(row);
    }
    return grid;
  };

  return (
    <div className="camera-grid-container">
      <div className="camera-grid">
        {createGrid().map((row, rowIndex) => (
          <div key={rowIndex} className="grid-row">
            {row}
          </div>
        ))}
      </div>
      {/* Popup for Full-Screen View (live stream) */}
      {popupActive && (
        <div className="grid-popup-container active">
          <div className="grid-popup-content">
            <button className="grid-popup-close-btn" onClick={handleClosePopup}>X</button>
            {popupImageSrc ? (
              <img className="grid-popup-image" src={popupImageSrc} alt="Full Screen View" />
            ) : (
              <div className="loader"></div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default CameraGrid; 