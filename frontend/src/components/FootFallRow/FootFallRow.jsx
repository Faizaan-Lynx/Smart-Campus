import React, { useEffect, useState } from "react";
import axios from "axios";
import { toast } from "react-toastify";

import "./FootFallRow.css";
import CameraList from "../CCTVCamList/CCTVCamList";

const FootFallRow = ({ cameras, selectedCamera, setSelectedCamera, loading }) => {

  return (
    <div className="app__container__row">
      <div className="video__container__row">
        {loading ? (
          <div className="loader" />
        ) : (
          <CameraList cameras={cameras} selectedCamera={selectedCamera} setSelectedCamera={setSelectedCamera} />
        )}
      </div>
    </div>
  );
};

export default FootFallRow;
