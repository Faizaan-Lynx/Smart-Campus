import React, { useState, useEffect } from "react";
import { localurl } from "../../utils";
import "./CCTVCamList.css";

const CameraList = ({ cameras, selectedCamera, setSelectedCamera }) => {
  const [loading, setLoading] = useState(false);
  const [popupActive, setPopupActive] = useState(false);
  const [selectedUrl, setSelectedUrl] = useState(cameras[0]?.url || "");

  // console.log("Cameras: ", );
  useEffect(() => {
    // console.log("Selected Camera:", selectedCamera);
    if (selectedCamera) {
      const camera = cameras.find((cam) => cam.id === selectedCamera);
      setSelectedUrl(camera?.url || "");
      setLoading(false);
    }
  }, [selectedCamera, cameras]); // Reacts to changes in selectedCamera

  // Function to extract YouTube video ID and return the correct embed URL
  const getYouTubeEmbedUrl = (url) => {
    const videoIdMatch = url.match(
      /(?:youtube\.com\/(?:.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]+)/
    );
    return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
  };

  const youtubeEmbedUrl = getYouTubeEmbedUrl(selectedUrl);
  const isYouTube = !!youtubeEmbedUrl;

  const handleImageClick = () => {
    setPopupActive(true);
    setLoading(false); // Ensure loader appears before fetching image
    const popupImg = document.getElementById("camera_feed_popup");
    // popupImg.src = `${localurl}/intrusion_feed/${selectedCamera}`;
    

    popupImg.onload = () => setLoading(false);
    popupImg.onerror = () => setLoading(false);
  };

  const handleClosePopup = () => {
    setPopupActive(false);
    setLoading(false);
  };

  return (
    <div className="camera-feed-container">
      <div className="camera-list">
        {cameras.map((camera) => (
          <div
            key={camera.id}
            className={`camera-card ${
              selectedCamera === camera.id ? "active" : ""
            }`}
            onClick={() => setSelectedCamera(camera.id)}
          >
            <p>Camera {camera.id}</p>
          </div>
        ))}
      </div>

      <div className="video-feed" onClick={handleImageClick}>
        {loading && <div className="cctv_camera_loader"></div>}

        {isYouTube ? (
          <iframe
            className="camera__feed__image"
            src={youtubeEmbedUrl}
            title="YouTube Video Stream"
            frameBorder="0"
            allowFullScreen
            alt="Video Stream"
          ></iframe>
        ) : (
          <img
            className={`camera__feed__image ${loading ? "hidden" : ""}`}
            id="camera_feed"
            src={selectedUrl}
            alt="Video Stream"
          />
        )}
        {/* <div className="video__container">
          <img
            className={`camera__feed__image ${loading ? "hidden" : ""}`}
            id="camera_feed"
            alt="Video Stream"
          />
        </div> */}
      </div>

      {/* Popup Modal */}
      <div className={`cctv-popup-container ${popupActive ? "active" : ""}`}>
        <div className="cctv-popup-content">
          <button className="cctv-popup-close-btn" onClick={handleClosePopup}>
            X
          </button>
          {loading && <div className="cctv_popup_loader"></div>}
          <iframe
            className="camera__feed_iframe"
            src={youtubeEmbedUrl}
            title="YouTube Video Stream"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
};
export default CameraList;
