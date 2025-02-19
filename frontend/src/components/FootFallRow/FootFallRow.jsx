import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import "./FootFallRow.css";
import FootFall from "../FootFall/FootFall";
import VideoFeed from "../VideoFeed/VideoFeed";
import "../GenderRatioRow/GenderRatiorow.css";
import RepeatRatio from "../RepeatRatio/RepeatRatio";
import CameraList from "../CCTVCamList/CCTVCamList";

const FootFallRow = ({ visitData, siteId }) => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/camera/");
        setCameras(response.data);
      } catch (error) {
        toast.error("Failed to fetch camera list. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  return (
    <div className="app__container__row">
      {/* <div className="footfall__container">
        <FootFall visitData={visitData} />
        <RepeatRatio visitData={visitData} />
      </div> */}

      {/* Repeat Ratio Graph */}
      {/* <div className="footfall_repeat_ratio_container">
        <FootFall visitData={visitData} />
        <RepeatRatio visitData={visitData} />
      </div> */}

      <div className="video__container__row">
        {/* <VideoFeed visitData={visitData} siteId={siteId} /> */}
        {loading ? (
          <p>Loading cameras...</p>
        ) : (
          <CameraList cameras={cameras} />
        )}
      </div>
    </div>
  );
};

export default FootFallRow;
