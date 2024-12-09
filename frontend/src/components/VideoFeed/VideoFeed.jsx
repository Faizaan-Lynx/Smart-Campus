import React, { useEffect } from "react";
import "./VideoFeed.css";
import assets from "../../assets";
import { localurl } from "../../utils";

const VideoFeed = ({ siteId }) => {
  useEffect(() => {
    const img = document.getElementById("camera_feed");
    img.src = `${localurl}/video_feed/${siteId}`;
  }, []);

  

  return (
    <div className="main__video__feed">
      <div className="video__container">
        <img
          className="camera__feed__image"
          id="camera_feed"
          alt="Video Stream"
        />
      </div>
    </div>
  );
};

export default VideoFeed;
