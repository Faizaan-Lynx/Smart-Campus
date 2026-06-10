import React, { useCallback } from "react";
import CameraCard from "../CameraCard/CameraCard";
import "./CameraHorizontalView.css";
import { useNavigate } from "react-router-dom";

const CameraHorizontalView = ({
  cameras,
  selectedCamera,
  setSelectedCamera,
  imageSrcs,
  loading,
  onFullscreen,
}) => {
  const handleSelectCamera = useCallback(
    (cameraId) => {
      setSelectedCamera(cameraId);
    },
    [setSelectedCamera]
  );
    const navigate = useNavigate();
  

  if (cameras.length === 0) {
    return (
      <div className="camera-horizontal-view">
        <div className="camera-horizontal__empty-state">
          <p>No cameras available</p>
          <button className="camera-horizontal__empty-state-btn" onClick={() => navigate("/cameras")}>
            + Add Camera
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-horizontal-view">
      <div className="camera-horizontal__scroll-container">
        {cameras.map((camera) => (
          <div key={camera.id} className="camera-horizontal__card-wrapper">
            <CameraCard
              camera={camera}
              imageSrc={imageSrcs[camera.id]}
              isLoading={loading[camera.id] || false}
              onSelect={handleSelectCamera}
              onFullscreen={onFullscreen}
              isSelected={selectedCamera === camera.id}
            />
          </div>
        ))}
      </div>
    </div>
  );
};

export default CameraHorizontalView;
