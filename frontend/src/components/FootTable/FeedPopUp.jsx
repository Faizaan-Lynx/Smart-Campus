import React from "react";
import "./FeedPopup.css";

const FeedPopup = ({ filePath, onClose }) => {
  // Extract video ID from the YouTube URL
  const getEmbedUrl = (url) => {
    const videoIdMatch = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([^&]+)/);
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : url;
  };

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>Camera Feed</h3>
        <iframe
          width="100%"
          height="400px"
          src={getEmbedUrl(filePath)}
          frameBorder="0"
          allowFullScreen
          title="Live Camera Feed"
        ></iframe>
        <button className="close-button" onClick={onClose}>Close</button>
      </div>
    </div>
  );
};

export default FeedPopup;
