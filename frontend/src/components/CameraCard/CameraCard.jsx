import React, { useState } from "react";
import "./CameraCard.css";
import { FaFire } from "react-icons/fa";

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
        {camera.detect_fire_smoke && (
          <span className="camera-card__fire-badge" title="Fire/smoke detection enabled">
            <FaFire />
          </span>
        )}
        {isLoading ? (
          <span className="camera-card__offline" style={{ color: "red" }}>
            ● Offline
          </span>
        ) : (
          <span className="camera-card__live live-status">● Live</span>
        )}
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
