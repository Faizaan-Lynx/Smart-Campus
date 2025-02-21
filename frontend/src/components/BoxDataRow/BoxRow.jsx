import React, { useEffect, useState } from "react";
import "./BoxRow.css";
import assets from "../../assets";

const BoxRow = ({ alerts }) => {
  const [filteredAlerts, setFilteredAlerts] = useState([]);

  useEffect(() => {
    const updateAlerts = () => {
      const now = Date.now(); // Current time in milliseconds

      // Filter alerts that happened within the last 5 seconds
      const updatedAlerts = alerts.filter((alert) => {
        const secondsAgo = Number(alert.timestamp); // Convert timestamp to a number
        if (isNaN(secondsAgo)) return false; // Ignore invalid timestamps

        const alertTime = now - secondsAgo * 1000; // Convert seconds to milliseconds
        return now - alertTime <= 24 * 60 * 60 * 1000; // Check if within 24 hours
      });

      setFilteredAlerts(updatedAlerts);
    };

    updateAlerts(); // Run immediately on mount

    const interval = setInterval(updateAlerts, 10000); // Run every 10 second

    return () => clearInterval(interval); // Cleanup on unmount
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
