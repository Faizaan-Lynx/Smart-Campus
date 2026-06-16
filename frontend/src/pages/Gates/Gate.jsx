import React, { useEffect, useState, useRef } from "react";
import FootFallRow from "../../components/FootFallRow/FootFallRow";
import "./Gate.css";
import VehicleTable from "../../components/VehicleTable/VehicleTable";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "react-toastify";
import BACKEND_URL from '../../config.js';

const Gate = () => {
  // Camera Related Variables
  const [cameras, setCameras] = useState([]);

  const [selectedCamera, setSelectedCamera] = useState(null);

  const [loading, setLoading] = useState(false);
  
  // Fetch Cameras

  const fetchCameraDetails = async (cameraIds, token) => {
    const cameraPromises = cameraIds.map(async (cameraId) => {
      try {
        const response = await axios.get(
          `http://${BACKEND_URL}/camera/${cameraId}`,
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
          response = await axios.get(`http://${BACKEND_URL}/camera/`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          const userId = decodedToken.id;
          const userResponse = await axios.get(
            `http://${BACKEND_URL}/users/${userId}`,
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


        const filteredCameras = response.data.filter(camera => camera.detect_intrusions === false);
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
  return (
    <div className="gate__main">
      <div className="gate__content">
        <div className="gate__text__main">
          <div className="dashboard__text">
            <h1 className="gate__heading">Gate Vehicle Tracking</h1>
            <p style={{ color: "#a1a5b7", fontSize: "14px", marginTop: "-10px", marginLeft: "31px" }}>
              Monitor and track vehicle entries with license plate recognition
            </p>
          </div>
        </div>

        <div className="footfall__container">
          <FootFallRow
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            loading={loading}
          />
        </div>
        <div style={{ marginTop: "30px", animation: "slideInUp 0.5s ease-out 0.2s both" }}>
          <VehicleTable />
        </div>
      </div>
    </div>
  );
};

export default Gate;
