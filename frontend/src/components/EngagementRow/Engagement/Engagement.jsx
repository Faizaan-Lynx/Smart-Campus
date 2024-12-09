import React, { useEffect, useState } from "react";
import "./Engagement.css";
import { BarChart, PieChart } from "@mui/x-charts";
import { color1, color2 } from "../../../utils";
import ColorGradients from "../../Dashboard/ColorGradients";

const Engagement = ({ visitData }) => {
  const [dataset, setDataset] = useState([
    { value: 0, engagement: "Avg" },
    { value: 0, engagement: "Min" },
    { value: 0, engagement: "Max" },
  ]);

  useEffect(() => {
    if (visitData?.length > 0) {
      const timeToMilliseconds = (timeString) => {
        if (timeString === null) {
          return 0;
        }
        const [hours, minutes, seconds] = timeString?.split(":").map(Number);
        return (hours * 60 * 60 + minutes * 60 + seconds) * 1000; // Convert to milliseconds
      };

      const timeDifferences = visitData
        .map((visit) => {
          const timeInMs = timeToMilliseconds(visit.time_in);
          const timeOutMs = timeToMilliseconds(visit.time_out);

          if (timeInMs !== null && timeOutMs !== null) {
            const timeDiff = timeOutMs - timeInMs;
            // console.log(`time_in: ${visit.time_in}, time_out: ${visit.time_out}, time difference: ${timeDiff}`);
            return timeDiff; // Time difference in milliseconds
          }
          return null; // Return null if timeOutMs is null
        })
        .filter((timeDiff) => timeDiff !== null && timeDiff >= 0);

      const minTime = Math.min(...timeDifferences) / (1000 * 60); // Convert to minutes
      const maxTime = Math.max(...timeDifferences) / (1000 * 60); // Convert to minutes
      const avgTime =
        timeDifferences.reduce((acc, time) => acc + time, 0) /
        (timeDifferences.length * 1000 * 60);
      setDataset([
        { value: avgTime, engagement: "Avg" },
        { value: minTime, engagement: "Min" },
        { value: maxTime, engagement: "Max" },
      ]);
    }
    // Set dataset directly with provided values
  }, [visitData]);

  return (
    <div className="genderratio__main__div ">
      <div className="genderratio__container engagement__container">
        <div className="genderratio__content__div">
          <p>Engagement</p>
        </div>
        <div className="genderratio__div engagement__graph">
          <ColorGradients />
          <BarChart
            // colors={["#367f2b"]}
            // colors={[color1, color2]}
            colors={["url(#gradColor1)"]}
            
            borderRadius={30}
            dataset={dataset}
            yAxis={[{ scaleType: "band", dataKey: "engagement" }]}
            series={[{ dataKey: "value" }]}
            layout="horizontal"
            grid={{ vertical: true }}
            height={250}
          />
        </div>
      </div>
    </div>
  );
};

export default Engagement;
