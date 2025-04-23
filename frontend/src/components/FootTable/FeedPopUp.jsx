import React, { useEffect, useState } from "react";
import "./FeedPopup.css";

const FeedPopup = ({ filePath, onClose }) => {
  const [imageUrl, setImageUrl] = React.useState(null);

  // If the blob data is received, create an object URL for it
  useEffect(() => {
    if (filePath) {
      const blobUrl = URL.createObjectURL(filePath);
      setImageUrl(blobUrl);

      // Clean up the URL object when the component is unmounted or blob data changes
      return () => {
        URL.revokeObjectURL(blobUrl);
      };
    }
  }, [filePath]);

  return (
    <div className="popup-overlay">
      <div className="popup-content">
        <h3>Camera Feed</h3>

        {imageUrl ? (
          <img
            src={imageUrl} // Use the generated object URL for the blob
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
