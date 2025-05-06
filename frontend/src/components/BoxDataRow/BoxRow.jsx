import React, { useEffect, useState } from "react";
import "./BoxRow.css";
import assets from "../../assets";

const BoxRow = ({ alerts }) => {
  const [filteredAlerts, setFilteredAlerts] = useState([]);
  // console.log("Alerts", alerts);

  useEffect(() => {
    const updateAlerts = () => {
      const now = new Date(); // Current date and time
  
      const updatedAlerts = alerts.filter((alert) => {
        if (!alert.timestamp) return false;
  
        const alertDate = new Date(alert.timestamp);
  
        if (isNaN(alertDate.getTime())) return false;
        
        return now - alertDate <= 24 * 60 * 60 * 1000; // within last 24 hours
      });
      console.log("Updated Alerts", updatedAlerts);
  
      setFilteredAlerts(updatedAlerts);
    };
  
    updateAlerts(); // Run on mount
    const interval = setInterval(updateAlerts, 10000); // Update every 10s
  
    return () => clearInterval(interval);
  }, [alerts]);
  

  // Automatically clear filteredAlerts after 24 hours if no new alerts come in
  useEffect(() => {
    if (filteredAlerts.length > 0) {
      const timeout = setTimeout(() => {
        setFilteredAlerts([]);
      }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

      return () => clearTimeout(timeout);
    }
  }, [filteredAlerts]);

  const statsArray = [
    { label: "Total Alerts", value: alerts.length },
    { label: "Last 24 Hours", value: filteredAlerts.length },
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
