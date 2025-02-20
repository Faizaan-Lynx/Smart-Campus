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
// import toast, { Toaster } from "react-hot-toast";
import { toast, ToastContainer } from "react-toastify";
import FootFall from "../FootFall/FootFall";

const Dashboard = () => {
  const selectedOptionRedux = useSelector((state) => state.auth.selectedOption);
  const [selectedOption, setSelectedOption] = useState();
  const dispatch = useDispatch();
  const [visitData, setVisitData] = useState();
  const [visitData1, setVisitData1] = useState();

  const [loading, setLoading] = useState(false);

  const [popupActive, setPopupActive] = useState(false);

  const { siteId } = useParams();
  // Camera Related Variables
  const [cameras, setCameras] = useState([]);

  const [selectedCamera, setSelectedCamera] = useState(null);
  // Alert Related Variables
  const [alerts, setAlerts] = useState([]);
  const [alertUrl, setAlertUrl] = useState(null);
  const [isFirstLoad, setIsFirstLoad] = useState(true);

  const handleClosePopup = () => {
    setPopupActive(false);
    setLoading(false);
  };

  const handleToastClick = (url, cameraId) => {
    const getYouTubeEmbedUrl = (url) => {
      const videoIdMatch = url.match(
        /(?:youtube\.com\/(?:.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]+)/
      );
      return videoIdMatch
        ? `https://www.youtube.com/embed/${videoIdMatch[1]}`
        : null;
    };

    const youtubeEmbedUrl = getYouTubeEmbedUrl(url);
    setAlertUrl(youtubeEmbedUrl);
    setSelectedCamera(cameraId); // Update selected camera
    console.log("Selected Camera: ", cameraId);
    setPopupActive(true);
    setLoading(true);
  };

  // Fetch Cameras
  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/camera/");
        setCameras(response.data);
        setSelectedCamera(response.data[0].id); // Set first camera as selected
      } catch (error) {
        toast.error("Failed to fetch camera list. Please try again later.");
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();
  }, []);

  // Fetch Alerts 
  useEffect(() => {
    const fetchAlerts = async () => {
      try {
        const response = await axios.get("http://127.0.0.1:8000/alerts/", {
          headers: { accept: "application/json" },
        });

        if (response.data && response.data.length > 0) {
          setAlerts(response.data); // Store initial alerts
        }

        // Mark the first load as done
        setIsFirstLoad(false);
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    // Fetch initial alerts
    fetchAlerts();

    // Setup WebSocket connection
    const socket = new WebSocket("ws://127.0.0.1:8000/ws/alerts");

    socket.onopen = () => {
      console.log("✅ WebSocket Connected");
    };

    socket.onmessage = (event) => {
      const newAlert = JSON.parse(event.data);

      setAlerts((prevAlerts) => {
        if (!prevAlerts.some((a) => a.id === newAlert.id)) {
          // Show toast notification for real-time alerts
          toast(`🚨 New Alert at Camera ${newAlert.camera_id}`, {
            duration: 5000,
            position: "top-right",
            style: { background: "#333", color: "white", cursor: "pointer" },
            onClick: () => handleToastClick(newAlert.file_path, newAlert.camera_id),
          });

          return [...prevAlerts, newAlert]; // Add the new alert to state
        }
        return prevAlerts;
      });
    };

    socket.onerror = (error) => {
      console.error("❌ WebSocket Error:", error);
    };

    socket.onclose = () => {
      console.log("⚠️ WebSocket Disconnected");
    };

    return () => {
      socket.close(); // Cleanup WebSocket on unmount
    };
  }, []); // Runs only once when component mount


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
      //toast.dismiss();
      if (parsedData.time_out != null) {
        // toast.error("A person left");
      } else {
        //Wtoast.success("New visit!");
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
      <ToastContainer
        onClick={handleToastClick}
        theme="light"
        position="top-right"
        className="toast-container"
        toastClassName="toast-message"
      />

      <div className="dashboard__content">
        <div className="dashboard__text__main">
          <div className="dashboard__text">
            {/* <p className="overview__text">{visitData1?.name}'s Overview</p> */}
            <p className="dash__text">Main Dashboard</p>
            {/* </div>
          <div className="top_heading_right select-dropdown">
            <select value={selectedOptionRedux} onChange={handleOptionChange}> */}
            {/* <option value="last12Hours">Last 12 Hours</option> */}
            {/* <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
              <option value="last7Days">Last 7 Days</option>
              <option value="lastMonth">Last Month</option>
              <option value="allTime">All Time</option>
            </select> */}
          </div>
        </div>
        <BoxRow alerts={alerts} />
        <FootFallRow
          visitData={visitData}
          siteId={siteId}
          cameras={cameras}
          selectedCamera={selectedCamera} // Pass selectedCamera
          setSelectedCamera={setSelectedCamera} // Pass setter function
        />{" "}
        {/* Line Graph Added Below the Video Row */}
        {/* <FootFall visitData={visitData} /> */}
        {/* <GenderRatioRow visitData={visitData} /> */}
        {/* <EngagementRow visitData={visitData} /> */}
        <FootTable visitData={visitData} />
      </div>
      {/* Popup Modal */}
      <div className={`cctv-popup-container ${popupActive ? "active" : ""}`}>
        <div className="cctv-popup-content">
          <button className="cctv-popup-close-btn" onClick={handleClosePopup}>
            X
          </button>
          {loading && <div className="cctv_popup_loader"></div>}
          <iframe
            className="camera__feed_iframe"
            src={alertUrl}
            title="YouTube Video Stream"
            frameBorder="0"
            allowFullScreen
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
