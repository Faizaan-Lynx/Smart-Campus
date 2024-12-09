import React, { useEffect, useState } from "react";
import "./RepeatRatio.css";
import { PieChart } from "@mui/x-charts";
import { color1, color2, color3 } from "../../utils";
import ColorGradients from "../Dashboard/ColorGradients";

const RepeatRatio = ({ visitData }) => {
  const [chartData, setChartData] = useState([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        if (visitData) {
          const newCount = visitData.filter((visit) => visit.is_new).length;
          const returningCount = visitData.filter(
            (visit) => !visit.is_new
          ).length;

          // const total = newCount + returningCount;
          // const newPercentage = ((newCount / total) * 100).toFixed(0);
          // const returningPercentage = ((returningCount / total) * 100).toFixed(
          //   0
          // );
          const processedData = [
            { id: 0, value: newCount, label: `New` },
            {
              id: 1,
              value: returningCount,
              label: `Repeat`,
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
          <p>Repeat Ratio</p>
        </div>
        <div className="genderratio__div">
          <ColorGradients />
          <PieChart
            // colors={["#367f2b", "#5FDD9D", "#499167"]}
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
                padding: -5,
                labelStyle: {
                  fontSize: 13,
                  fill: "#2d3748",
                },
              },
            }}
            series={[
              {
                innerRadius: 43,
                // outerRadius: 85,
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

export default RepeatRatio;
