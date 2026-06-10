import React, { useState } from "react";
import "./CameraCard.css";

const CameraCard = ({
  camera,
  imageSrc,
  isLoading,
  onSelect,
  onFullscreen,
  isSelected,
}) => {
  const [isHovering, setIsHovering] = useState(false);

  return (
    <div
      className={`camera-card ${isSelected ? "camera-card--active" : ""}`}
      onClick={() => onSelect && onSelect(camera.id)}
      onMouseEnter={() => setIsHovering(true)}
      onMouseLeave={() => setIsHovering(false)}
    >
      <div className="camera-card__header">
        <h3 className="camera-card__name">{camera.location || `Camera ${camera.id}`}</h3>
        <span className="camera-card__live">● Live</span>
      </div>

      <div className={`camera-card__media ${isLoading ? "camera-card__media--loading" : ""}`}>
        {imageSrc ? (
          <img src={imageSrc} alt={`${camera.location || `Camera ${camera.id}`}`} />
        ) : (
          <div className="camera-card__loader" />
        )}
        {isHovering && !isLoading && (
          <button
            className="camera-card__fullscreen-btn"
            onClick={(e) => {
              e.stopPropagation();
              onFullscreen && onFullscreen(camera.id);
            }}
            title="Fullscreen"
          >
            ⛶
          </button>
        )}
      </div>
    </div>
  );
};

export default CameraCard;
