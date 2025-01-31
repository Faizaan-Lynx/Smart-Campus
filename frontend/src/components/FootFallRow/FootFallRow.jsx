import React from "react";
import "./FootFallRow.css";
import FootFall from "../FootFall/FootFall";
import VideoFeed from "../VideoFeed/VideoFeed";
import "../GenderRatioRow/GenderRatiorow.css";
import RepeatRatio from "../RepeatRatio/RepeatRatio";

const FootFallRow = ({ visitData, siteId }) => {
  return (
    <div className="app__container__row">
      {/* <div className="footfall__container">
        <FootFall visitData={visitData} />
        <RepeatRatio visitData={visitData} />
      </div> */}

      {/* Repeat Ratio Graph */}
      <div className="footfall_repeat_ratio_container">
        {/* <FootFall visitData={visitData} /> */}
        <RepeatRatio visitData={visitData} />
      </div>

      <div className="video__container__row">
        <VideoFeed visitData={visitData} siteId={siteId} />
      </div>
    </div>
  );
};

export default FootFallRow;
