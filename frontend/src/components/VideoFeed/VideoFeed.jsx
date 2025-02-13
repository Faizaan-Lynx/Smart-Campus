import React, { useEffect, useState } from "react";
import "./VideoFeed.css";
import { localurl } from "../../utils";

const VideoFeed = ({ siteId }) => {
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const img = document.getElementById("camera_feed");
    img.src = `${localurl}/intrusion_feed/1`;

    // Hide loader when the image loads
    img.onload = () => setLoading(false);
    img.onerror = () => setLoading(false); // Hide loader even if image fails
  }, []);

  return (
    <div className="dashboard_video__container">
      {loading && <div className="loader"></div>}
      <img
        className={`camera__feed__image ${loading ? "hidden" : ""}`}
        id="camera_feed"
        alt="Video Stream"
      />
    </div>
  );
};

export default VideoFeed;
