import React, { useEffect, useState } from "react";
import "./GenderTimeline.css";
import { BarChart } from "@mui/x-charts";
import { color1, color2, color3 } from "../../../utils";
import ColorGradients from "../../Dashboard/ColorGradients";

// const uData = [4000, 3000, 2000, 2780, 1890, 2390, 3490];
// const pData = [2400, 1398, 9800, 3908, 4800, 3800, 4300];
// const gData = [2400, 1398, 9800, 3908, 4800, 3800, 4300];
const xLabels = [
  "Page A",
  "Page B",
  "Page C",
  "Page D",
  "Page E",
  "Page F",
  "Page G",
];
const GenderTimeline = ({ visitData }) => {
  const [isSmallScreen, setIsSmallScreen] = useState(false);
  const [seriesData, setSeriesData] = useState([]);
  const [xAxisData, setXAxisData] = useState([]);

  const [genderData, setGenderData] = useState();
  const [step, setStep] = isSmallScreen ? useState(3) : useState(1);

  useEffect(() => {
    const handleResize = () => {
      setIsSmallScreen(window.innerWidth < 850);
    };

    window.addEventListener("resize", handleResize);
    handleResize();

    return () => window.removeEventListener("resize", handleResize);
  }, []);

  useEffect(() => {
    try {
      const categorizedData = categorizeVisitsByGender(visitData);
      // console.log(categorizedData);
      const aggregatedData = aggregateDataByHour(categorizedData);
      // setGenderData(aggregatedData);
      // console.log(genderData);
      // console.log(aggregatedData);
      // console.log(visitData);
      const xAxisLabels = aggregatedData.map((item) => item.hour);
      const femaleData = aggregatedData.map((item) => item.Female);
      const maleData = aggregatedData.map((item) => item.Male);
      const unknownData = aggregatedData.map((item) => item.Unknown);
      setXAxisData(xAxisLabels);
      setSeriesData([
        { data: femaleData, label: "Female", id: "male", stack: "total" },
        { data: maleData, label: "Male", id: "female", stack: "total" },
        { data: unknownData, label: "Unknown", id: "unknown", stack: "total" },
      ]);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
  }, [visitData, step, isSmallScreen]);

  const categorizeVisitsByGender = (visits) => {
    return visits?.map((visit) => {
      // Extract hour from the time_in string in "HH:mm:ss" format
      const hourString = visit.time_in.substring(0, 2); // Extract first two characters for hour
      const hour = parseInt(hourString, 10); // Convert extracted string to integer

      return {
        hour: hour,
        gender: getGenderCategory(visit.is_female),
      };
    });
  };

  const getGenderCategory = (isFemale) => {
    if (isFemale === true) return "Female";
    else if (isFemale === false) return "Male";
    else return "Unknown";
  };

  const aggregateDataByHour = (data) => {
    const aggregatedData = {};
    // console.log(data);
    data?.forEach((entry) => {
      const { hour, gender } = entry;
      if (!aggregatedData[hour]) {
        aggregatedData[hour] = { Male: 0, Female: 0, Unknown: 0 };
      }
      aggregatedData[hour][gender]++;
    });

    for (let hour = 0; hour <= 24; hour += step) {
      if (!aggregatedData[hour]) {
        aggregatedData[hour] = { Male: 0, Female: 0, Unknown: 0 };
      }
    }

    // Convert aggregated data to array format for chart
    const chartData = [];

    for (let hour = 0; hour <= 23; hour += step) {
      chartData.push({
        hour: `${hour}`,
        Male: aggregatedData[hour].Male,
        Female: aggregatedData[hour].Female,
        Unknown: aggregatedData[hour].Unknown,
      });
    }

    return chartData;
  };

  return (
    <div className="genderratio__main__div timeline__container">
      <div className="genderratio__container">
        <div className="genderratio__content__div">
          <p>Gender Timeline</p>
        </div>
        <div className="genderratio__div">
          <ColorGradients />
          <BarChart
            // colors={["#367f2b", "#5FDD9D", "#499167"]}
            // colors={[color1, color2, color3]}
            height={320}
            colors={[
              "url(#gradColor1)",
              "url(#gradColor2)",
              "url(#gradColor3)",
            ]}
            series={seriesData}
            xAxis={[{ data: xAxisData, scaleType: "band" }]}
            slotProps={{
              legend: {
                position: {
                  vertical: "bottom",
                  horizontal: "center",
                },
                direction: "row",
                itemMarkHeight: 10,
                itemMarkWidth: 10,
                itemSpacing: 10,
                padding: -5,
                labelStyle: {
                  fontSize: 13,
                  fill: "#2d3748",
                },
              },
            }}
          />
        </div>
      </div>
    </div>
  );
};

export default GenderTimeline;
