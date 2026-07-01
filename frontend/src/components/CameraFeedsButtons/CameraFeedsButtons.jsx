import React, { useState, useEffect } from "react";
import "./CameraFeedsButtons.css";
import axios from "axios";
import { jwtDecode } from "jwt-decode";
import BACKEND_URL from '../../config.js';

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
      .get(`http://${BACKEND_URL}/intrusions/start_all_feed_workers`, { headers })
      .then((response) => {
        console.log("✅ Feed Workers Response:", response.data);
      })
      .catch((error) => {
        console.error("❌ Failed to start feed workers:", error);
      });
  
    // Second API call - start license plate workers
    // axios
    //   .get("http://${BACKEND_URL}/license-plates/start_all_workers", { headers })
    //   .then((response) => {
    //     console.log("✅ License Plate Workers Response:", response.data);
    //     alert("Feeds and license plate workers started successfully.");
    //   })
    //   .catch((error) => {
    //     console.error("❌ Failed to start license plate workers:", error);
    //     alert("Failed to start license plate workers. Check console for details.");
      // });
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
      .get("http://${BACKEND_URL}/intrusions/stop_all_feed_workers", { headers })
      .then((response) => {
        console.log("✅ Feed Workers Stop Response:", response.data);
      })
      .catch((error) => {
        console.error("❌ Failed to stop feed workers:", error);
      });
  
    // Second API call - stop license plate workers
    // axios
    //   .get("http://${BACKEND_URL}/license-plates/stop_all_workers", { headers })
    //   .then((response) => {
    //     console.log("✅ License Plate Workers Stop Response:", response.data);
    //     alert("Feeds and license plate workers stopped successfully.");
    //   })
    //   .catch((error) => {
    //     console.error("❌ Failed to stop license plate workers:", error);
    //     alert("Failed to stop license plate workers. Check console for details.");
    //   });
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
                    <button
            className="Start_Button"
            onClick={startFeeds}
            style={{
              padding: "12px 18px",
              background: "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)",
              color: "white",
              border: "none",
              borderRadius: "4px",
              cursor: "pointer",
              fontSize: "16px",
              fontWeight: "600",
              transition: "all 0.3s ease",
              boxShadow: "0 2px 6px rgba(34, 197, 94, 0.2)",
            }}
            onMouseEnter={(e) => {
              e.target.style.background =
                "linear-gradient(135deg, #16a34a 0%, #15803d 100%)";
              e.target.style.boxShadow =
                "0 4px 10px rgba(34, 197, 94, 0.3)";
              e.target.style.transform = "translateY(-1px)";
            }}
            onMouseLeave={(e) => {
              e.target.style.background =
                "linear-gradient(135deg, #22c55e 0%, #16a34a 100%)";
              e.target.style.boxShadow =
                "0 2px 6px rgba(34, 197, 94, 0.2)";
              e.target.style.transform = "translateY(0)";
            }}
          >
            Start Feeds
          </button>
          <button           className="Stop_Button"
                            onClick={stopFeeds}
                            style={{
                              padding: "12px 18px",
                              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "4px",
                              cursor: "pointer",
                              fontSize: "16px",
                              fontWeight: "600",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.2)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                              e.target.style.boxShadow = "0 4px 10px rgba(239, 68, 68, 0.3)";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                              e.target.style.boxShadow = "0 2px 6px rgba(239, 68, 68, 0.2)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
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
