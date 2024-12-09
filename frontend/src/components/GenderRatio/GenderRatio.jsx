import React, { useEffect, useState } from "react";
import "./Genderratio.css";
import { PieChart } from "@mui/x-charts";
import {
  color1,
  color2,
  color3,
  filterVisits,
  localurl,
  token,
} from "../../utils";
import { useSelector } from "react-redux";
import axios from "axios";
import ColorGradients from "../Dashboard/ColorGradients";

const GenderRatio = ({ visitData }) => {
  const selectedOptionRedux = useSelector((state) => state.auth.selectedOption);
  const [genderCounts, setGenderCounts] = useState({
    male: 0,
    female: 0,
    unknown: 0,
  });

  useEffect(() => {
    if (visitData) {
      const data = visitData;
      const counts = data.reduce(
        (acc, visit) => {
          if (visit.is_female === true) {
            acc.female++;
          } else if (visit.is_female === false) {
            acc.male++;
          } else {
            acc.unknown++;
          }
          return acc;
        },
        { male: 0, female: 0, unknown: 0 }
      );
      setGenderCounts(counts);
    }
  }, [selectedOptionRedux, visitData]);

  return (
    <div className="genderratio__main__div">
      <div className="genderratio__container">
        <div className="genderratio__content__div">
          <p>Gender Ratio</p>
        </div>
        <div className="genderratio__div">
          <ColorGradients />
          <PieChart
            // colors={["#367f2b", "#5FDD9D", "#499167"]}
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
                data: [
                  { id: 0, value: genderCounts.male, label: "Male" },
                  { id: 1, value: genderCounts.female, label: "Female" },
                  { id: 2, value: genderCounts.unknown, label: "Unknown" },
                ],
              },
            ]}
            height={220}
          />
        </div>
      </div>
    </div>
  );
};

export default GenderRatio;
