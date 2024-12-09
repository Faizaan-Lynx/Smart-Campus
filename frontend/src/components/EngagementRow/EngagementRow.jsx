import React from "react";
import "./EngagementRow.css";
import Engagement from "./Engagement/Engagement";
import GenderTimeline from "./GenderTimeline/GenderTimeline";

const EngagementRow = ({ visitData }) => {
  return (
    <div className="engagement__app__container__row">
      <div className="engagement__footfall__container">
        <Engagement visitData={visitData} />
      </div>
      <div className="engagement__video__container__row">
        <GenderTimeline visitData={visitData} />
      </div>
    </div>
  );
};

export default EngagementRow;
