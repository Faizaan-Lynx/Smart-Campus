import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import "./FootFallRow.css";
import CameraList from "../CCTVCamList/CCTVCamList";
import CameraGrid from "../CameraGrid/CameraGrid";

const FootFallRow = ({ cameras, selectedCamera, setSelectedCamera, loading }) => {
  const [isGridLayout, setIsGridLayout] = useState(false); // Default to grid layout

  const toggleLayout = () => {
    setIsGridLayout(!isGridLayout);
  };

  return (
    <div className="app__container__row">
      <div className="video__container__row">
        {/* Layout Toggle */}
        <div className="layout-toggle-container">
          {/* <button 
            className={`toggle-btn ${isGridLayout ? 'active' : ''}`}
            onClick={toggleLayout}
          >
            {isGridLayout ? '📱 List View' : '🔲 Grid View'}
          </button> */}
        </div>
        
        {loading ? (
          <div className="loader" />
        ) : isGridLayout ? (
          <CameraGrid 
            cameras={cameras} 
            selectedCamera={selectedCamera} 
            setSelectedCamera={setSelectedCamera} 
          />
        ) : (
          <CameraList 
            cameras={cameras} 
            selectedCamera={selectedCamera} 
            setSelectedCamera={setSelectedCamera} 
          />
        )}
      </div>
    </div>
  );
};

export default FootFallRow;
