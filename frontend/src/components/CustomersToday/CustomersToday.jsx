import React, { useEffect, useState } from "react";
import "./CustomersToday.css";
import { PieChart } from "@mui/x-charts";
import { color1, color2, color3 } from "../../utils";

const CustomersToday = ({ visitData }) => {
  const [customerData, setCustomerData] = useState([]);

  useEffect(() => {
    // const fetchData = async () => {
    try {
      // console.log(visitData);
      // Extract required data attributes and update state
      const enteredCount = visitData?.length || 0;
      const leftCount =
        visitData?.filter((visit) => visit.time_out).length || 0; // Assuming time_out is present when a person leaves
      const instoreCount = enteredCount - leftCount;

      // Additional counts based on conditions
      const newCount =
        visitData?.filter((visit) => visit.is_new === true).length || 0;
      const returningCount =
        visitData?.filter((visit) => visit.is_new === false).length || 0;
      const groupsCount =
        visitData?.filter((visit) => visit.is_group === true).length || 0;

      // Update customerData array with calculated counts
      const newData = [
        {
          label: "Entered",
          value: enteredCount,
          className: "fa-right-to-bracket",
        },
        { label: "Left", value: leftCount, className: "fa-arrow-left" },
        {
          label: "In-store",
          value: instoreCount,
          className: "fa-person-shelter",
        },
        { label: "New", value: newCount, className: "fa-plus" },
        {
          label: "Returning",
          value: returningCount,
          className: "fa-rotate-left",
        },
        {
          label: "Groups",
          value: groupsCount,
          className: "fa-people-group",
        },
      ];
      setCustomerData(newData);
    } catch (error) {
      console.error("Error fetching data:", error);
    }
    // };
    // fetchData();
  }, [visitData]);

  return (
    <div className="genderratio__main__div">
      <div className="genderratio__container customers_today">
        <div className="genderratio__content__div">
          <p>Customers Stats</p>
        </div>
        <div className="customers__today__div">
          {customerData?.map((item, index) => (
            <div key={index} className={`${item.label.toLowerCase()}__div`}>
              <p className="customers__p__tag">
                <i className={`fa-solid ${item.className} customer__icon`}></i>
                &nbsp;{item.label}
              </p>
              <p>{item.value}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default CustomersToday;
