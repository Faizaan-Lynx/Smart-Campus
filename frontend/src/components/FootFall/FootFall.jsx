import React, { useEffect, useState } from "react";
import "./Footfall.css";
import { LineChart } from "@mui/x-charts";
import { color1, color2, color3 } from "../../utils";
import { useSelector } from "react-redux";
import ColorGradients from "../Dashboard/ColorGradients";

const FootFall = ({ visitData }) => {
  const selectedOptionRedux = useSelector((state) => state.auth.selectedOption);
  const [update, setUpdate] = useState(false);
  const [chartData, setChartData] = useState({
    categories: [],
    series: [
      { name: "Entered", data: [] },
      { name: "Left", data: [] },
      { name: "In-Store", data: [] },
    ],
  });

  const groupByHour = (visits) => {
    const hourInData = {};
    const hourOutData = {};

    visits.forEach((visit) => {
      const hourIn = visit.time_in?.split(":")[0];
      const hourOut = visit.time_out?.split(":")[0];

      if (!hourInData[hourIn]) hourInData[hourIn] = [];
      if (!hourOutData[hourOut]) hourOutData[hourOut] = [];

      hourInData[hourIn].push(visit);
      hourOutData[hourOut].push(visit);
    });

    return { hourInData, hourOutData };
  };

  const getHoursArray = (option) => {
    // const currentHour = new Date().getHours();

    // if (option === "last12Hours") {
    //   // Generate the last 12 hours dynamically and reverse the array
    //   return Array.from({ length: 12 }, (_, index) =>
    //     ((currentHour - index + 24) % 24).toString().padStart(2, "0")
    //   ).reverse();
    // } else {
    // Generate all 24 hours dynamically and reverse the array if the selected option is not "allTime"
    return Array.from({ length: 19 }, (_, index) =>
      (5 + index).toString().padStart(2, "0")
    );
    // }
    // if (option == "last12Hours") {
    //   // return ["00", "01"];

    //   const currentHour = new Date().getHours();
    //   const hoursArray = [];

    //   for (let i = 11; i >= 0; i--) {
    //     let hour = currentHour - (11 - i);
    //     if (hour < 0) {
    //       hour += 24; // Adjust hour to handle negative values
    //     }
    //     hoursArray.push(hour < 10 ? `0${hour}` : `${hour}`);
    //   }
    //   console.log(option, hoursArray);
    //   return hoursArray;
    // } else {
    //   return Array.from({ length: 24 }, (_, index) =>
    //     index + 8 < 10 ? `0${index + 0}` : `${index + 0}`
    //   );
    // }
  };

  useEffect(() => {
    if (visitData) {
      const { hourInData, hourOutData } = groupByHour(visitData);

      const allHours = getHoursArray(selectedOptionRedux);

      // console.log(hourInData, hourOutData);
      const categories = allHours;
      // console.log(allHours);
      const timeInData = allHours.map((hour) =>
        hourInData[hour] ? hourInData[hour].length : 0
      );
      const timeOutData = allHours.map((hour) =>
        hourOutData[hour] ? hourOutData[hour].length : 0
      );
      const inStoreData = allHours.reduce((acc, hour, index) => {
        // Calculate the current in-store count by subtracting timeOutData from timeInData
        const currentInStore = timeInData[index] - timeOutData[index];

        // Calculate the total in-store count by adding the previous in-store count
        const totalInStore = (acc[index - 1] || 0) + currentInStore;

        // Ensure the in-store count is not negative
        const inStoreCount = Math.max(totalInStore, 0);

        // Push the in-store count to the acc array
        acc.push(inStoreCount);

        return acc;
      }, []);
      setChartData({
        categories: allHours,
        series: [
          {
            name: "Entered",
            data: timeInData,
            color: "url(#gradColor1)",
            label: "Entered",
          },
          {
            name: "Left",
            data: timeOutData,
            color: "url(#gradColor2)",
            label: "Left",
          },
          {
            name: "In-Store",
            data: inStoreData,
            color: "url(#gradColor3)",
            label: "In-store",
          },
        ],
      });
    }
  }, [visitData, selectedOptionRedux]);

  return (
    <div className="footfall__main__div">
      <div className="footfall__content__div">
        <p>Footfall</p>
      </div>
      <div className="line__container">
        <div className="box chart-box">
          <ColorGradients />
          <LineChart
            xAxis={[
              {
                tickMinStep: 1,
                tickMaxStep: 1,
                data: chartData.categories,
              },
            ]}
            series={chartData.series}
            height={350}
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

export default FootFall;
