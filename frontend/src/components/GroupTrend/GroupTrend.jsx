import React, { useEffect, useState } from "react";
import "./GroupTrend.css";
import { PieChart } from "@mui/x-charts";
import { color1, color2, color3 } from "../../utils";
import ColorGradients from "../Dashboard/ColorGradients";

const GroupTrend = ({ visitData }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (visitData) {
          const groupCount = visitData.filter((visit) => visit.is_group).length;
          const individualCount = visitData.filter(
            (visit) => !visit.is_group
          ).length;

          // const total = newCount + returningCount;
          // const newPercentage = ((newCount / total) * 100).toFixed(0);
          // const returningPercentage = ((returningCount / total) * 100).toFixed(
          //   0
          // );
          const processedData = [
            { id: 0, value: groupCount, label: `Group` },
            {
              id: 1,
              value: individualCount,
              label: `Individual`,
            },
          ];
          setChartData(processedData);
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };
    fetchData();
  }, [visitData]);

  return (
    <div className="genderratio__main__div">
      <div className="genderratio__container">
        <div className="genderratio__content__div">
          <p>Group Trend</p>
        </div>
        <div className="genderratio__div">
          <ColorGradients />
          <PieChart
            // colors={["#367f2b", "#5FDD9D", "#499167"]}
            // colors={["#D4C1EC", "#9F9FED", "#736CED"]}
            // colors={[color1, color2, color3]}
            colors={[
              "url(#gradColor1)",
              "url(#gradColor2)",
              "url(#gradColor3)",
            ]}
            slotProps={{
              legend: {
                direction: "column",
                itemMarkHeight: 10,
                itemMarkWidth: 10,
                padding: -3,
                labelStyle: {
                  fontSize: 13,
                  fill: "#2d3748",
                },
              },
            }}
            series={[
              {
                data: chartData,
              },
            ]}
            height={220}
          />
        </div>
      </div>
    </div>
  );
};

export default GroupTrend;
