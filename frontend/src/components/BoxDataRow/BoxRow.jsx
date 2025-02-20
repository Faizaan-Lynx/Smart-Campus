import React, { useEffect, useState } from "react";
import "./BoxRow.css";
import assets from "../../assets";

const BoxRow = ({ alerts }) => {
  const [stats, setStats] = useState({
    visits: 4,
    groups: 1,
    new: 2,
    females: 4,
  });

  // useEffect(() => {
  //   if (visitData) {
  //     const visits = visitData.length;
  //     const groups = visitData.filter((visit) => visit.is_group).length;
  //     const newVisitors = visitData.filter((visit) => visit.is_new).length;
  //     const females = visitData.filter((visit) => visit.is_female).length;

  //     setStats({ visits, groups, new: newVisitors, females });
  //   }
  // }, [visitData]);

  const getLast24HoursAlerts = (alerts) => {
    const now = new Date();
    
    return alerts.filter((alert) => {
      // Parse "dd mm yyyy" format to a Date object
      const [day, month, year] = alert.timestamp.split(" ");
      const alertDate = new Date(`${year}-${month}-${day}`); // Convert to YYYY-MM-DD format
  
      // Check if alert happened in the last 24 hours
      const timeDifference = now - alertDate;
      return timeDifference <= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
    }).length;
  };
  
  const statsArray = [
    { label: "Total Alerts", value: alerts.length },
    { label: "Last 24 Hours", value: getLast24HoursAlerts(alerts) },
  ];
  

  return (
    <div className="box__main__div">
      {statsArray.map((stat, index) => (
        <div className="card" key={index}>
          <img src={assets.logo} alt={`Card ${index}`} className="card-image" />
          <div className="card-content">
            <p className="stat_1">{stat.label}</p>
            <p className="stat_2">{stat.value}</p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default BoxRow;
