import React from "react";
import "./FootFallRow.css";
import FootFall from "../FootFall/FootFall";
import VideoFeed from "../VideoFeed/VideoFeed";
import "../GenderRatioRow/GenderRatiorow.css";
import RepeatRatio from "../RepeatRatio/RepeatRatio";
import CameraList from "../CCTVCamList/CCTVCamList";

const FootFallRow = ({ visitData, siteId }) => {
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
        <CameraList cameras={[
          {
            id: 1,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 1",
          },
          {
            id: 2,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 2",
          },
          {
            id: 3,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 3",
          },
          {
            id: 4,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 5",
          },
          {
            id: 5,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 5",
          },
          {
            id: 6,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 6",
          },
          {
            id: 7,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 7",
          },
          
          {
            id: 8,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 8",
          },
          {
            id: 9,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 9",
          },
          {
            id: 10,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 10",
          },
          {
            id: 11,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 11",
          },{
            id: 12,
            thumbnail: "https://via.placeholder.com/150",
            name: "Camera 12",
          },
        ]} />
      </div>
    
    </div>
  );
};

export default FootFallRow;
