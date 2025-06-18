import React, { useEffect, useState, useRef } from "react";
import "./Dashboard.css";
import BoxRow from "../BoxDataRow/BoxRow";
import FootFallRow from "../FootFallRow/FootFallRow";
import GenderRatioRow from "../GenderRatioRow/GenderRatioRow";
import EngagementRow from "../EngagementRow/EngagementRow";
import FootTable from "../FootTable/FootTable";
import { updateSelectedOption } from "../../redux/actions/authActions";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { filterVisits, localurl } from "../../utils";
import { useParams } from "react-router-dom";
// import toast, { Toaster } from "react-hot-toast";
import { toast, ToastContainer } from "react-toastify";
import FootFall from "../FootFall/FootFall";
import FeedPopup from "../FootTable/FeedPopUp";
import { jwtDecode } from "jwt-decode";

const Dashboard = () => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const [popupActive, setPopupActive] = useState(false);

  // Camera Related Variables
  const [cameras, setCameras] = useState([]);

  const [selectedCamera, setSelectedCamera] = useState(null);
  // Alert Related Variables
  const [alerts, setAlerts] = useState([]);
  const [alertUrl, setAlertUrl] = useState(null);
  const socketsRef = useRef({}); // Keep track of active WebSocket connections

  const handleClosePopup = () => {
    setPopupActive(false);
    setLoading(false);
  };

  //Start All Feeds
  useEffect(() => {
    const startFeeds = () => {
      console.log("▶️ Attempting to start feeds...");
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("🔒 No token found in localStorage.");
        return;
      }

      axios
        .get("http://127.0.0.1:8000/intrusions/start_all_feed_workers", {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        })
        .then((response) => {
          console.log("✅ API Response:", response.data);
          alert("Feeds started successfully");
        })
        .catch((error) => {
          console.error("❌ Failed to start feeds:", error);
          alert("Failed to start feeds. Check console for details.");
        });
    };
  }, []);

  // Fetch Cameras

  const fetchCameraDetails = async (cameraIds, token) => {
    const cameraPromises = cameraIds.map(async (cameraId) => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/camera/${cameraId}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch camera ${cameraId}`, error);
        return null;
      }
    });

    const cameras = await Promise.all(cameraPromises);
    return cameras.filter((camera) => camera !== null); // Remove failed fetches
  };

  useEffect(() => {
    const fetchCameras = async () => {
      const token = localStorage.getItem("token");

      if (!token) {
        if (!toast.isActive("token-error")) {
          toast.error("No authentication token found!", {
            toastId: "token-error",
          });
        }
        setLoading(false);
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";

        let response;
        if (isAdmin) {
          response = await axios.get("http://127.0.0.1:8000/camera/", {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          const userId = decodedToken.id;
          const userResponse = await axios.get(
            `http://127.0.0.1:8000/users/${userId}`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const user = userResponse.data;
          if (!user || !user.cameras.length) {
            if (!toast.isActive("no-cameras")) {
              toast.error("No cameras assigned to this user.", {
                toastId: "no-cameras",
              });
            }
            setLoading(false);
            return;
          }

          response = { data: await fetchCameraDetails(user.cameras, token) };
        }


        const filteredCameras = response.data.filter(camera => camera.detect_intrusions === true);
        const sortedCameras = filteredCameras.sort((a, b) => a.id - b.id);
        setCameras(sortedCameras);

        setSelectedCamera(sortedCameras[0]?.id || null);
      } catch (error) {
        console.error("Error fetching cameras:", error);
        if (!toast.isActive("fetch-error")) {
          toast.error("Failed to fetch cameras. Please try again later.", {
            toastId: "fetch-error",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  //Fetch Alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found!");
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";

        let alertUrls = [];

        if (isAdmin) {
          alertUrls = ["ws://localhost:8000/ws/alerts"]; // ✅ Single WebSocket for Admin
        } else {
          alertUrls = cameras.map(
            (camera) => `ws://localhost:8000/ws/alerts/${camera.id}`
          );
        }

        console.log("Connecting to WebSockets:", alertUrls);

        // Fetch initial alerts (Filtered for users)
        const alertEndpoint = isAdmin
          ? "http://127.0.0.1:8000/alerts/"
          : `http://127.0.0.1:8000/alerts?camera_id=${cameras
            .map((c) => c.id)
            .join(",")}`;

        const response = await axios.get(alertEndpoint, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.length > 0) {
          const filteredAlerts = isAdmin
            ? response.data
            : response.data.filter((alert) =>
              cameras.some((camera) => camera.id === alert.camera_id)
            );

          const sortedFormattedAlerts = filteredAlerts
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((item) => {
              const utcDate = new Date(item.timestamp + "Z"); // Append Z to mark UTC
              return {
                ...item,
                timestamp: utcDate.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }),
              };
            });

          setAlerts(sortedFormattedAlerts);
        }


        // Open WebSocket connections
        alertUrls.forEach((url) => {
          if (socketsRef.current[url]) {
            console.log(`🔄 WebSocket already connected: ${url}`);
            return; // Prevent duplicate WebSocket connections
          }

          const socket = new WebSocket(url);
          socketsRef.current[url] = socket; // Store reference

          socket.onopen = () => {
            console.log(`✅ WebSocket Connected: ${url}`);
          };

          socket.onmessage = (event) => {
            const newAlert = JSON.parse(event.data);
            console.log("🔔 New Alert Received:", newAlert);

            // 🔍 Check if alert field exists and parse it
            let alertData;
            try {
              alertData = JSON.parse(newAlert.alert); // ✅ Parse the alert JSON string
            } catch (error) {
              console.error(
                "❌ Failed to parse alert data:",
                newAlert.alert,
                error
              );
              return;
            }

            const utcDate = new Date(alertData.timestamp + "Z");
            alertData.timestamp = utcDate.toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });


            if (!alertData.file_path) {
              console.error("❌ Missing file_path in alertData:", alertData);
              return;
            }

            setAlerts((prevAlerts) => [alertData, ...prevAlerts]); // ✅ Use parsed alertData

            toast(`🚨 New Alert at Camera ${alertData.camera_id}`, {
              duration: 50000,
              position: "top-right",
              style: {
                background: "#333",
                color: "white",
                cursor: "pointer",
              },
              onClick: () =>
                handleToastClick(alertData.file_path, alertData.camera_id), // ✅ Use alertData.file_path
            });
          };

          socket.onerror = (error) => {
            console.error(`❌ WebSocket Error (${url}):`, error);
          };

          socket.onclose = () => {
            console.log(`⚠️ WebSocket Disconnected: ${url}`);
            delete socketsRef.current[url]; // Remove reference when closed
          };
        });
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    fetchAlerts();

    return () => {
      Object.values(socketsRef.current).forEach((socket) => socket.close());
    };
  }, [cameras]);

  const handleToastClick = (data, cameraId) => {
    console.log("handleToastClick called with Camera ID:", cameraId);

    if (!data) {
      console.error(`Error: No video data received for Camera ID: ${cameraId}`);
      toast.error(`No valid video feed for Camera ${cameraId}`);
      return;
    }

    // Convert byte data into a Blob URL
    const blob = new Blob([data], { type: "image/jpeg" }); // Assuming JPEG format
    const blobUrl = URL.createObjectURL(blob);

    setSelectedCamera(cameraId);
    setAlertUrl(blobUrl); // Set blob URL to display the image
    setPopupActive(true);
    setLoading(false);
  };

  return (
    <div className="dashboard__main">
      <ToastContainer
        onClick={handleToastClick}
        theme="light"
        position="top-right"
        className="toast-container"
        toastClassName="toast-message"
      />

      <div className="dashboard__content">
        <div className="dashboard__text__main">
          <div className="dashboard__text">
            {/* <p className="overview__text">{visitData1?.name}'s Overview</p> */}
            <p className="dash__text">Main Dashboard</p>
            {/* </div>
          <div className="top_heading_right select-dropdown">
            <select value={selectedOptionRedux} onChange={handleOptionChange}> */}
            {/* <option value="last12Hours">Last 12 Hours</option> */}
            {/* <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7Days">Last 7 Days</option>
              <option value="lastMonth">Last Month</option>
              <option value="allTime">All Time</option>
            </select> */}
          </div>
        </div>
        <BoxRow alerts={alerts} />
        <FootFallRow
          cameras={cameras}
          selectedCamera={selectedCamera} // Pass selectedCamera
          setSelectedCamera={setSelectedCamera} // Pass setter function
          loading={loading}
        />
        {/* Line Graph Added Below the Video Row */}
        {/* <FootFall visitData={visitData} /> */}
        {/* <GenderRatioRow visitData={visitData} /> */}
        {/* <EngagementRow visitData={visitData} /> */}
        <FootTable alerts={alerts} setAlerts={setAlerts} />
      </div>
      {popupActive && (
        <FeedPopup filePath={alertUrl} onClose={handleClosePopup} />
      )}
    </div>
  );
};

export default Dashboard;
