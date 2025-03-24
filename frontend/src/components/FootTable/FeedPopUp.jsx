import React from "react";
import "./FeedPopup.css";

const FeedPopup = ({ filePath, onClose }) => {
  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>Camera Feed</h3>

        {filePath ? (
          <img
            src={filePath}
            alt="Live Camera Feed"
            width="100%"
            height="400px"
            style={{ objectFit: "contain", borderRadius: "8px" }}
          />
        ) : (
          <p>Loading feed...</p>
        )}

        <button className="close-button" onClick={onClose}>
          Close
        </button>
      </div>
    </div>
  );
};

export default FeedPopup;
