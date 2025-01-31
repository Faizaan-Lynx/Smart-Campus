import React, { useEffect, useState } from "react";
import "./Dashboard.css";
import BoxRow from "../BoxDataRow/BoxRow";
import FootFallRow from "../FootFallRow/FootFallRow";
import GenderRatioRow from "../GenderRatioRow/GenderRatioRow";
import EngagementRow from "../EngagementRow/EngagementRow";
import FootTable from "../FootTable/FootTable";
import { updateSelectedOption } from "../../redux/actions/authActions";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { filterVisits, localurl } from "../../utils";
import { useParams } from "react-router-dom";
import toast, { Toaster } from "react-hot-toast";

const Dashboard = () => {
  const selectedOptionRedux = useSelector((state) => state.auth.selectedOption);
  const [selectedOption, setSelectedOption] = useState();
  const dispatch = useDispatch();
  const [visitData, setVisitData] = useState();
  const [visitData1, setVisitData1] = useState();

  const { siteId } = useParams();

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
        setVisitData1(response.data);
      } catch (error) {
        console.error("Error fetching data:", error);
      }
    };

    fetchData();
  }, []);

  useEffect(() => {
    if (visitData1) {
      const visitDetails = filterVisits(visitData1, selectedOptionRedux);
      setVisitData(visitDetails.visits);
    }
  }, [visitData1, selectedOptionRedux]);

  useEffect(() => {
    const eventSource = new EventSource(`${localurl}/new_visit`);
    eventSource.onmessage = (event) => {
      const jsonString = event.data.replace("data: ", "");
      const parsedData1 = JSON.parse(jsonString);
      const parsedData = JSON.parse(parsedData1.data);
      // console.log(parsedData);
      // console.log(parsedData.site_id);
      if (parsedData.site_id != siteId) {
        return;
      }
      const newData = {
        date_in: parsedData.date_in,
        guest: {},
        guest_id: null,
        id: parsedData.id,
        is_female: parsedData.is_female,
        is_group: parsedData.is_group,
        is_new: parsedData.is_new,
        site_id: parsedData.site_id,
        time_in: parsedData.time_in,
        time_out: parsedData.time_out,
      };
      if (visitData) setVisitData((prevData) => [newData, ...prevData]);
      toast.dismiss();
      if (parsedData.time_out != null) {
        toast.error("A person left");
      } else {
        toast.success("New visit!");
      }
    };

    return () => {
      eventSource.close();
    };
  }, []);

  const handleOptionChange = (e) => {
    const newOption = e.target.value;
    setSelectedOption(newOption); // Update local state
    // Dispatch action to update Redux store
    dispatch(updateSelectedOption(newOption));
  };

  return (
    <div className="dashboard__main">
      <div className="dashboard__content">
        <div className="dashboard__text__main">
          <div className="dashboard__text">
            <p className="overview__text">{visitData1?.name}'s Overview</p>
            <p className="dash__text">Main Dashboard</p>
          </div>
          <div className="top_heading_right select-dropdown">
            <select value={selectedOptionRedux} onChange={handleOptionChange}>
              {/* <option value="last12Hours">Last 12 Hours</option> */}
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7Days">Last 7 Days</option>
              <option value="lastMonth">Last Month</option>
              <option value="allTime">All Time</option>
            </select>
          </div>
        </div>
        <BoxRow visitData={visitData} />
        <FootFallRow visitData={visitData} siteId={siteId} />
        {/* <GenderRatioRow visitData={visitData} /> */}
        {/* <EngagementRow visitData={visitData} /> */}
        <FootTable visitData={visitData} />
      </div>
      <Toaster />
    </div>
  );
};

export default Dashboard;
