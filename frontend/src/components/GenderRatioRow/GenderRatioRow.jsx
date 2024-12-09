import React from "react";
import "./GenderRatiorow.css";
import GenderRatio from "../GenderRatio/GenderRatio";
import CustomersToday from "../CustomersToday/CustomersToday";
import RepeatRatio from "../RepeatRatio/RepeatRatio";
import GroupTrend from "../GroupTrend/GroupTrend";

const GenderRatioRow = ({ visitData }) => {
  return (
    <div className="dashboard__gender__container">
      <GenderRatio visitData={visitData} />
      <CustomersToday visitData={visitData} />
      <RepeatRatio visitData={visitData} />
      <GroupTrend visitData={visitData} />
    </div>
  );
};

export default GenderRatioRow;
