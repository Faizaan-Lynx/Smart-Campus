import React, { useEffect, useState } from "react";
import { LineChart } from "@mui/x-charts";
import { color1, color2, color3, filterVisits, localurl } from "../../utils";
import { useSelector } from "react-redux";
import ColorGradients from "../../components/Dashboard/ColorGradients";
import axios, { all } from "axios";

const HomeFootFall = ({ siteId, siteName }) => {
  const [visitData, setVisitData] = useState(null);
  const selectedOptionRedux = useSelector((state) => state.auth.selectedOption);
  const [filteredData, setFilteredData] = useState(null);
  const [chartData, setChartData] = useState({
    categories: [],
    series: [
      { name: "Entered", data: [] },
      { name: "Left", data: [] },
      { name: "In-Store", data: [] },
    ],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${localurl}/dashboard/sites/${siteId}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setVisitData(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []); // Empty dependency array to run effect only once

  useEffect(() => {
    if (visitData) {
      const data = filterVisits(visitData, "allTime");
      setFilteredData(data.visits);
      const { hourInData, hourOutData } = groupByHour(filteredData);
      const allHours = getHoursArray(selectedOptionRedux);
      const categories = allHours;
      const timeInData = allHours.map((hour) =>
        hourInData[hour] ? hourInData[hour].length : 0
      );
      const timeOutData = allHours.map((hour) =>
        hourOutData[hour] ? hourOutData[hour].length : 0
      );
      const inStoreData = allHours.reduce((acc, hour, index) => {
        if (index === 0) {
          acc.push(timeInData[index]);
        } else {
          const inStore =
            acc[index - 1] + timeInData[index] - timeOutData[index];
          acc.push(Math.max(inStore, 0));
        }
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
      console.log(chartData.categories);
    }
  }, [visitData, selectedOptionRedux]);

  const groupByHour = (visits) => {
    const hourInData = {};
    const hourOutData = {};

    visits?.forEach((visit) => {
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
    return Array.from({ length: 24 }, (_, index) =>
      index + 8 < 10 ? `0${index + 0}` : `${index + 0}`
    );
  };

  //     const getHoursArray = (option) => {
  //     if (option === "last12Hours") {
  //       const currentHour = new Date().getHours();
  //       return Array.from(
  //         { length: 12 },
  //         (_, index) => (currentHour - index + 24) % 24
  //       )
  //         .reverse()
  //         .map((hour) => (hour < 10 ? `0${hour}` : `${hour}`)); // Convert to strings with leading zero
  //     } else {
  //       return Array.from({ length: 23 }, (_, index) =>
  //         index + 8 < 10 ? `0${index + 0}` : `${index + 0}`
  //       );
  //     }
  //   };

  return (
    <div className="footfall__main__div">
      <div className="footfall__content__div">
        <p>{siteName}'s Footfall</p>
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

export default HomeFootFall;
