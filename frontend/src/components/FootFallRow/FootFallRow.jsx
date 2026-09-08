import React, { useEffect, useState, useRef } from "react";
import "./FootFallRow.css";
import CameraGridView from "../CameraGridView/CameraGridView";
import CameraHorizontalView from "../CameraHorizontalView/CameraHorizontalView";
import BACKEND_URL from '../../config.js';

const FootFallRow = ({ cameras, selectedCamera, setSelectedCamera, loading }) => {
  const [imageSrcs, setImageSrcs] = useState({});
  const [streamLoading, setStreamLoading] = useState({});
  const [popupActive, setPopupActive] = useState(false);
  const [popupCameraId, setPopupCameraId] = useState(null);
  const [popupImageSrc, setPopupImageSrc] = useState(null);
  const [layoutView, setLayoutView] = useState("horizontal");
  const popupWsRef = useRef(null);
  const wsConnectionsRef = useRef({});

  // Load layout preference from localStorage (set from Camera Management page)
  useEffect(() => {
    const savedLayout = localStorage.getItem("cameraLayoutView") || "horizontal";
    setLayoutView(savedLayout);
  }, []);

  // WebSocket connections for camera feeds
  useEffect(() => {
    if (!cameras || cameras.length === 0) return;

    cameras.forEach((camera) => {
      if (wsConnectionsRef.current[camera.id]) return; // Already connected

      const socket = new WebSocket(`ws://${BACKEND_URL}/ws/frames/${camera.id}`);

      socket.onopen = () => {
        console.log(`Connected to WebSocket for Camera ${camera.id}`);
        setStreamLoading((prev) => ({ ...prev, [camera.id]: false }));
      };

      socket.onmessage = (event) => {
        const imageBlob = new Blob([event.data], { type: "image/jpeg" });
        const imageUrl = URL.createObjectURL(imageBlob);
        setImageSrcs((prev) => {
          const oldUrl = prev[camera.id];
          if (oldUrl) URL.revokeObjectURL(oldUrl); // Clean up old URL
          return { ...prev, [camera.id]: imageUrl };
        });
      };

      socket.onerror = (error) => {
        console.error(`WebSocket Error for Camera ${camera.id}:`, error);
        setStreamLoading((prev) => ({ ...prev, [camera.id]: true }));
      };

      socket.onclose = () => {
        console.log(`Disconnected from WebSocket for Camera ${camera.id}`);
        delete wsConnectionsRef.current[camera.id];
      };

      wsConnectionsRef.current[camera.id] = socket;
    });

    return () => {
      Object.values(wsConnectionsRef.current).forEach((socket) => {
        if (socket && socket.readyState === WebSocket.OPEN) {
          socket.close();
        }
      });
      wsConnectionsRef.current = {};
    };
  }, [cameras]);

  // Handle fullscreen popup
  useEffect(() => {
    if (!popupActive || !popupCameraId) {
      if (popupWsRef.current) {
        popupWsRef.current.close();
        popupWsRef.current = null;
      }
      return;
    }

    const socket = new WebSocket(`ws://${BACKEND_URL}/ws/frames/${popupCameraId}`);
    popupWsRef.current = socket;

    socket.onopen = () => console.log(`Popup WS connected for Camera ${popupCameraId}`);

    socket.onmessage = (event) => {
      const imageBlob = new Blob([event.data], { type: "image/jpeg" });
      const imageUrl = URL.createObjectURL(imageBlob);
      setPopupImageSrc((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return imageUrl;
      });
    };

    socket.onerror = (error) => console.error(`Popup WS error for Camera ${popupCameraId}:`, error);
    socket.onclose = () => console.log(`Popup WS closed for Camera ${popupCameraId}`);

    return () => {
      if (socket && socket.readyState === WebSocket.OPEN) {
        socket.close();
      }
    };
  }, [popupActive, popupCameraId]);

  const handleFullscreen = (cameraId) => {
    setPopupCameraId(cameraId);
    setPopupActive(true);
  };

  const handleClosePopup = () => {
    setPopupActive(false);
    setPopupCameraId(null);
    setPopupImageSrc(null);
  };

  return (
    <div className="app__container__row">
      <div className="video__container__row">
        {loading ? (
          <div className="loader" />
        ) : layoutView === "grid" ? (
          <CameraGridView
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            imageSrcs={imageSrcs}
            loading={streamLoading}
            onFullscreen={handleFullscreen}
            initialVisibleLimit={8}
          />
        ) : (
          <CameraHorizontalView
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            imageSrcs={imageSrcs}
            loading={streamLoading}
            onFullscreen={handleFullscreen}
          />
        )}
      </div>

      {/* Fullscreen Popup Modal */}
      {popupActive && (
        <div className="camera-popup-container active">
          <div className="camera-popup-content">
            <button className="camera-popup-close-btn" onClick={handleClosePopup}>✕</button>
            <div className="camera-popup-media">
              {popupImageSrc ? (
                <img
                  src={popupImageSrc}
                  alt={`Camera ${popupCameraId} Fullscreen`}
                  className="camera-popup-image"
                />
              ) : (
                <div className="camera-popup-loader" />
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default FootFallRow;