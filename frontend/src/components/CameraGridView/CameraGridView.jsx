import React, { useState, useMemo, useCallback } from "react";
import CameraCard from "../CameraCard/CameraCard";
import "./CameraGridView.css";

const CameraGridView = ({
  cameras,
  selectedCamera,
  setSelectedCamera,
  imageSrcs,
  loading,
  onFullscreen,
  initialVisibleLimit = 8,
}) => {
  const [showAll, setShowAll] = useState(false);

  const visibleCameras = useMemo(() => {
    if (showAll) {
      return cameras;
    }
    return cameras.slice(0, initialVisibleLimit);
  }, [cameras, showAll, initialVisibleLimit]);

  const handleToggleShowMore = useCallback(() => {
    setShowAll((prev) => !prev);
  }, []);

  const handleSelectCamera = useCallback(
    (cameraId) => {
      setSelectedCamera(cameraId);
    },
    [setSelectedCamera]
  );

  if (cameras.length === 0) {
    return (
      <div className="camera-grid-view">
        <div className="camera-grid__empty-state">
          <p>No cameras available</p>
          <button className="camera-grid__empty-state-btn">+ Add Camera</button>
        </div>
      </div>
    );
  }

  return (
    <div className="camera-grid-view">
      <div className={`camera-grid__container ${showAll ? "expanded" : "collapsed"}`}>
        {visibleCameras.map((camera) => (
          <CameraCard
            key={camera.id}
            camera={camera}
            imageSrc={imageSrcs[camera.id]}
            isLoading={loading[camera.id] || false}
            onSelect={handleSelectCamera}
            onFullscreen={onFullscreen}
            isSelected={selectedCamera === camera.id}
          />
        ))}
      </div>

      {cameras.length > initialVisibleLimit && (
        <button
          className="camera-grid__expand-btn"
          onClick={handleToggleShowMore}
        >
          {showAll ? "Show Less Cameras" : "Show More Cameras"}
        </button>
      )}
    </div>
  );
};

export default CameraGridView;
