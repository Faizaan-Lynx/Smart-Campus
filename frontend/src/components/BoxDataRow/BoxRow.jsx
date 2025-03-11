import React, { useEffect, useState } from "react";
import "./BoxRow.css";
import assets from "../../assets";

const BoxRow = ({ alerts }) => {
  const [filteredAlerts, setFilteredAlerts] = useState([]);

  useEffect(() => {
    const updateAlerts = () => {
      const now = new Date(); // Current date and time

      // Filter alerts that happened within the last 24 hours
      const updatedAlerts = alerts.filter((alert) => {
        if (!alert.timestamp) return false; // Ignore missing timestamps

        // Parse "dd mm yyyy" format to Date object
        const [day, month, year] = alert.timestamp.split(" ");
        const alertDate = new Date(`${year}-${month}-${day}`); // Convert to YYYY-MM-DD

        if (isNaN(alertDate)) return false; // Ignore invalid dates

        // Check if the alert is within the last 24 hours
        return now - alertDate <= 24 * 60 * 60 * 1000; // 24 hours in milliseconds
      });

      setFilteredAlerts(updatedAlerts);
      // console.log(updatedAlerts);
    };

    updateAlerts(); // Run immediately on mount
    const interval = setInterval(updateAlerts, 10000); // Run every 10 seconds

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
