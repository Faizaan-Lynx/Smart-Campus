import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";
import { jwtDecode } from "jwt-decode";
import axios from "axios";

export const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const [cameras, setCameras] = useState([]);
  const socketsRef = useRef({});
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const [openToasts, setOpenToasts] = useState(0);

  // Fetch cameras (copied from Dashboard logic)
  useEffect(() => {
    const fetchCameraDetails = async (cameraIds, token) => {
      const cameraPromises = cameraIds.map(async (cameraId) => {
        try {
          const response = await axios.get(
            `http://172.23.10.26:8000/camera/${cameraId}`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          return response.data;
        } catch (error) {
          return null;
        }
      });
      const cameras = await Promise.all(cameraPromises);
      return cameras.filter((camera) => camera !== null);
    };

    const fetchCameras = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";
        let response;
        if (isAdmin) {
          response = await axios.get("http://172.23.10.26:8000/camera/", {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          const userId = decodedToken.id;
          const userResponse = await axios.get(
            `http://172.23.10.26:8000/users/${userId}`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );
          const user = userResponse.data;
          if (!user || !user.cameras.length) return;
          response = { data: await fetchCameraDetails(user.cameras, token) };
        }
        const filteredCameras = response.data.filter(camera => camera.detect_intrusions === true);
        const sortedCameras = filteredCameras.sort((a, b) => a.id - b.id);
        setCameras(sortedCameras);
      } catch (error) {
        // Ignore errors for global context
      }
    };
    fetchCameras();
  }, []);

  // Fetch alerts and setup WebSocket
  useEffect(() => {
    const fetchAlerts = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;
      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";
        let alertUrls = [];
        if (isAdmin) {
          alertUrls = ["ws://172.23.10.26:8000/ws/alerts"];
        } else {
          alertUrls = cameras.map(
            (camera) => `ws://172.23.10.26:8000/ws/alerts/${camera.id}`
          );
        }
        // Fetch initial alerts
        const alertEndpoint = isAdmin
          ? "http://172.23.10.26:8000/alerts/"
          : `http://172.23.10.26:8000/alerts?camera_id=${cameras
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
              const utcDate = new Date(item.timestamp + "Z");
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
          if (socketsRef.current[url]) return;
          const socket = new WebSocket(url);
          socketsRef.current[url] = socket;
          socket.onmessage = (event) => {
            const newAlert = JSON.parse(event.data);
            let alertData;
            try {
              alertData = JSON.parse(newAlert.alert);
            } catch (error) {
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
            if (!alertData.file_path) return;
            setAlerts((prevAlerts) => [alertData, ...prevAlerts]);
            toast(`🚨 New Alert at Camera ${alertData.camera_id}`, {
              autoClose: false,
              closeOnClick: false,
              position: "top-right",
              style: {
                background: "#333",
                color: "white",
                cursor: "pointer",
                maxHeight: '80vh',
                overflowY: 'auto',
              },
            });
          };
          socket.onclose = () => {
            delete socketsRef.current[url];
          };
        });
      } catch (error) {
        // Ignore errors for global context
      }
    };
    fetchAlerts();
    return () => {
      Object.values(socketsRef.current).forEach((socket) => socket.close());
    };
  }, [cameras]);

  // Play sound when there are active toasts
  useEffect(() => {
    // Helper to play the sound
    const playSound = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    };
    // If there are alerts, start interval
    if (openToasts > 0) {
      if (!intervalRef.current) {
        playSound();
        intervalRef.current = setInterval(playSound, 2000);
      }
    } else {
      // No alerts, stop sound
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // Cleanup on unmount
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [openToasts]);

  return (
    <AlertContext.Provider value={{ alerts, setAlerts }}>
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
      <ToastContainer
        theme="light"
        position="top-right"
        className="toast-container"
        toastClassName="toast-message"
        autoClose={false}
        closeOnClick={false}
        draggable={false}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
        onOpen={() => setOpenToasts((count) => count + 1)}
        onClose={() => setOpenToasts((count) => Math.max(0, count - 1))}
      />
      {children}
    </AlertContext.Provider>
  );
}; 