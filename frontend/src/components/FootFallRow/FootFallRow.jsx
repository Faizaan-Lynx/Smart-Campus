import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import "./FootFallRow.css";
import CameraList from "../CCTVCamList/CCTVCamList";

const FootFallRow = ({ cameras, selectedCamera, setSelectedCamera }) => {
  const [loading, setLoading] = useState(false);

  // Handle camera selection and trigger the API
  const handleCameraSelect = async (cameraId) => {
    setSelectedCamera(cameraId);
    setLoading(true);

    try {
      const response = await axios.post("http://127.0.0.1:8000/test_publish_feed/", {
        camera_id: cameraId,
      });

      console.log(response.data);

      // toast.success(`Camera feed started for ID: ${cameraId}`);
    } catch (error) {
      toast.error("Failed to start camera feed.");
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app__container__row">
      <div className="video__container__row">
        {loading ? (
          <p>Loading cameras...</p>
        ) : (
          <CameraList cameras={cameras} selectedCamera={selectedCamera} setSelectedCamera={handleCameraSelect} />
        )}
      </div>
    </div>
  );
};

export default FootFallRow;
