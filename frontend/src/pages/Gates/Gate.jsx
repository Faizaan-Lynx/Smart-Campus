import React, { useEffect, useState, useRef } from "react";
import FootFallRow from "../../components/FootFallRow/FootFallRow";
import "./Gate.css";
import VehicleTable from "../../components/VehicleTable/VehicleTable";

const Gate = () => {
  // Camera Related Variables
  const [cameras, setCameras] = useState([]);

  const [selectedCamera, setSelectedCamera] = useState(null);

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

        setCameras(response.data);
        const sortedCameras = response.data.sort((a, b) => a.id - b.id);
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
          <div className="gate__text">
            <p className="gate__heading">Gate Feeds</p>
          </div>
        </div>

        <div className="footfall__container">
          <FootFallRow
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
          />
        </div>
        <VehicleTable />
      </div>
    </div>
  );
};

export default Gate;
