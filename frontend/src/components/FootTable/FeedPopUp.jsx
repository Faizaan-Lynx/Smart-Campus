import React, { useEffect, useState } from "react";
import "./FeedPopup.css";
// FeedPopup Component
const FeedPopup = ({ row, onClose }) => {
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [feedContent, setFeedContent] = useState("");
  
    // Simulate API Call
    React.useEffect(() => {
      setLoading(true);
      setError(null);
  
      setTimeout(() => {
        // Simulating API response
        if (Math.random() > 0.2) {
          setFeedContent(`Live feed data for ${row.location}`);
          setLoading(false);
        } else {
          setError("Failed to load feed. Please try again.");
          setLoading(false);
        }
      }, 2000);
    }, [row]);
  
    return (
      <div className="popup-overlay">
        <div className="popup-content">
          <h3>Camera Feed - {row.location}</h3>
          {loading ? (
            <div className="loader"></div>
          ) : error ? (
            <div className="error-message">{error}</div>
          ) : (
            <p>{feedContent}</p>
          )}
          <button className="close-button" onClick={onClose}>Close</button>
        </div>
      </div>
    );
  };
  
  export default FeedPopup;