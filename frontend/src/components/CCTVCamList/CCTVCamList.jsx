import React, { useState, useEffect } from "react";
import "./CCTVCamList.css";
import { localurl } from "../../utils";

const CameraList = ({ cameras }) => {
  const [selectedCamera, setSelectedCamera] = useState(cameras[0]?.id || "");
  const [loading, setLoading] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(cameras[0]?.url || "");

  useEffect(() => {
    console.log(cameras);
    if (selectedCamera) {
      const camera = cameras.find((cam) => cam.id === selectedCamera);
      setSelectedUrl(camera?.url || "");
      setLoading(false);
    }
  }, [selectedCamera, cameras]);

  // Function to extract YouTube video ID and return the correct embed URL
  const getYouTubeEmbedUrl = (url) => {
    const videoIdMatch = url.match(
      /(?:youtube\.com\/(?:.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]+)/
    );
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(selectedUrl);
  const isYouTube = !!youtubeEmbedUrl;

  return (
    <div className="camera-feed-container">
      <div className="camera-list">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className={`camera-card ${selectedCamera === camera.id ? "active" : ""}`}
            onClick={() => setSelectedCamera(camera.id)}
          >
            <p>Camera {camera.id}</p>
          </div>
        ))}
      </div>

      <div className="video-feed">
        {loading && <div className="cctv_camera_loader"></div>}
        {/* Display the selected camera ID */}
        <h1>{selectedCamera}</h1>

        {isYouTube ? (
          <iframe
            className="camera__feed_iframe"
            src={youtubeEmbedUrl}
            title="YouTube Video Stream"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        ) : (
          <img
            className={`camera__feed__image ${loading ? "hidden" : ""}`}
            id="camera_feed"
            src={selectedUrl}
            alt="Video Stream"
          />
        )}
      </div>
    </div>
  );
};

export default CameraList;
