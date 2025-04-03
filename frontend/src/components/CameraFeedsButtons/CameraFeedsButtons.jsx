import React, { useState, useEffect } from "react";
import axios from "axios";

const CameraFeedsButtons = () => {
  const [userInfo, setUserInfo] = useState(() => {
    // Load from localStorage (if exists), otherwise default to null
    const storedUser = localStorage.getItem("userInfo");
    return storedUser ? JSON.parse(storedUser) : null;
  });

  useEffect(() => {
    if (!userInfo) {
      axios.get("http://127.0.0.1:8000/users")
        .then(response => {
          console.log("User Info from API:", response.data);
          // Assuming you can identify the logged-in user by id or email, filter the correct user
          const loggedInUser = response.data.find(user => user.id === 29); // Change this to a dynamic condition if needed
          setUserInfo(loggedInUser); // Set the user information
          localStorage.setItem("userInfo", JSON.stringify(loggedInUser)); // Store the logged-in user info in localStorage
        })
        .catch(error => console.error("Error fetching user info:", error));
    }
  }, [userInfo]);

  const fetchUserInfo = () => {
    const token = localStorage.getItem("authToken");  // Retrieve token from localStorage
    if (token) {
      axios.get("http://127.0.0.1:8000/users/me", {
        headers: {
          Authorization: `Bearer ${token}`,  // Send the token in the Authorization header
        },
      })
      .then(response => {
        setUserInfo(response.data);
        localStorage.setItem("userInfo", JSON.stringify(response.data));  // Store the user info in localStorage
      })
      .catch(error => {
        console.error("Error fetching user data:", error);
      });
    }
  };

  const startFeeds = () => {
    console.log("Attempting to start feeds...");
  
    axios.get("http://127.0.0.1:8000/intrusions/start_all_feed_workers")
      .then(response => {
        console.log("API Response:", response.data);
        alert("Feeds started successfully");
      })
      .catch(error => {
        console.error("Failed to start feeds:", error);
        alert("Failed to start feeds. Check console for details.");
      });
  };

  const stopFeeds = () => {
    console.log("Attempting to stop feeds...");
    
    // Call the API route to stop the feeds
    axios.get("http://127.0.0.1:8000/intrusions/stop_all_feed_workers")
      .then(response => {
        console.log("API Response:", response.data);
        // Notify the user that feeds are stopped
        alert("Feeds stopped successfully.");
      })
      .catch(error => {
        console.error("Failed to stop feeds:", error);
        alert("Failed to stop feeds. Check console for details.");
      });
  };

  if (userInfo === null) {
    return <p>Loading...</p>;  // Show loading state while fetching user data
  }

  // Check for admin role and return buttons only if admin
  return (
    <>
      {userInfo.is_admin ? (
        <div className="camera-feeds__buttons">
          <button className="Start_Button" onClick={startFeeds}>Start Feeds</button>
          <button className="Stop_Button" onClick={stopFeeds}>Stop Feeds</button>
        </div>
      ) : (
        <p>You do not have permission to view these controls.</p>
      )}
    </>
  );
};

export default CameraFeedsButtons;
