import React, { useState, useEffect } from "react";
import "./CameraFeedsButtons.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";

const CameraFeedsButtons = () => {
  const [userInfo, setUserInfo] = useState(() => {
    const storedUser = localStorage.getItem("userInfo");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log("Decoded token:", decoded);
        setUserInfo(decoded);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  // 🟢 Start feeds
  const startFeeds = () => {
    console.log("▶️ Attempting to start feeds...");
    const token = localStorage.getItem("token");
  
    const headers = {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  
    // First API call - start feed workers
    axios
      .get("http://127.0.0.1:8000/intrusions/start_all_feed_workers", { headers })
      .then((response) => {
        console.log("✅ Feed Workers Response:", response.data);
      })
      .catch((error) => {
        console.error("❌ Failed to start feed workers:", error);
      });
  
    // Second API call - start license plate workers
    axios
      .get("http://127.0.0.1:8000/license-plates/start_all_workers", { headers })
      .then((response) => {
        console.log("✅ License Plate Workers Response:", response.data);
        alert("Feeds and license plate workers started successfully.");
      })
      .catch((error) => {
        console.error("❌ Failed to start license plate workers:", error);
        alert("Failed to start license plate workers. Check console for details.");
      });
  };
  

  // 🔴 Stop feeds
  const stopFeeds = () => {
    console.log("⏹️ Attempting to stop feeds...");
    const token = localStorage.getItem("token");
  
    const headers = {
      accept: "application/json",
      Authorization: `Bearer ${token}`,
    };
  
    // First API call - stop feed workers
    axios
      .get("http://127.0.0.1:8000/intrusions/stop_all_feed_workers", { headers })
      .then((response) => {
        console.log("✅ Feed Workers Stop Response:", response.data);
      })
      .catch((error) => {
        console.error("❌ Failed to stop feed workers:", error);
      });
  
    // Second API call - stop license plate workers
    axios
      .get("http://127.0.0.1:8000/license-plates/stop_all_workers", { headers })
      .then((response) => {
        console.log("✅ License Plate Workers Stop Response:", response.data);
        alert("Feeds and license plate workers stopped successfully.");
      })
      .catch((error) => {
        console.error("❌ Failed to stop license plate workers:", error);
        alert("Failed to stop license plate workers. Check console for details.");
      });
  };
  
  // 🕒 Show loading if userInfo not ready
  if (!userInfo) {
    return <p>Loading...</p>;
  }

  // ✅ Conditional rendering based on is_admin
  return (
    <>
      {userInfo?.role === "admin" ? (
        <div className="camera-feeds__buttons">
          <button className="Start_Button" onClick={startFeeds}>
            Start Feeds
          </button>
          <button className="Stop_Button" onClick={stopFeeds}>
            Stop Feeds
          </button>
        </div>
      ) : (
        <p>You do not have permission to view these controls.</p>
      )}
    </>
  );
};

export default CameraFeedsButtons;
