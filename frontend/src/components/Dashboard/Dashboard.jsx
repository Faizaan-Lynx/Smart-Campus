import React, { useEffect, useState, useRef } from "react";
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
import FeedPopup from "../FootTable/FeedPopUp";
import { jwtDecode } from "jwt-decode";

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
  const socketsRef = useRef({}); // Keep track of active WebSocket connections

  const handleClosePopup = () => {
    setPopupActive(false);
    setLoading(false);
  };

  const handleToastClick = (url, cameraId) => {
    console.log("handleToastClick called with URL:", url, "Camera ID:", cameraId);

    if (!url) {
        console.error(`Error: URL is undefined for Camera ID: ${cameraId}`);
        toast.error(`No valid video URL for Camera ${cameraId}`);
        return;
    }

    const getYouTubeEmbedUrl = (url) => {
        const videoIdMatch = url.match(
            /(?:youtube\.com\/(?:.*v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]+)/
        );
        return videoIdMatch ? `https://www.youtube.com/embed/${videoIdMatch[1]}` : null;
    };

    const youtubeEmbedUrl = getYouTubeEmbedUrl(url);
    if (!youtubeEmbedUrl) {
        console.error(`Invalid YouTube URL: ${url}`);
        toast.error("Invalid YouTube URL provided.");
        return;
    }

    setAlertUrl(youtubeEmbedUrl);
    setSelectedCamera(cameraId);
    setPopupActive(true);
    setLoading(true);
};


  // Fetch Cameras

  const fetchCameraDetails = async (cameraIds, token) => {
    const cameraPromises = cameraIds.map(async (cameraId) => {
      try {
        const response = await axios.get(
          `http://127.0.0.1:8000/camera/${cameraId}`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          }
        );
        return response.data;
      } catch (error) {
        console.error(`Failed to fetch camera ${cameraId}`, error);
        return null;
      }
    });

    const cameras = await Promise.all(cameraPromises);
    return cameras.filter((camera) => camera !== null); // Remove failed fetches
  };

  useEffect(() => {
    const fetchCameras = async () => {
      const token = localStorage.getItem("token");
  
      if (!token) {
        if (!toast.isActive("token-error")) {
          toast.error("No authentication token found!", { toastId: "token-error" });
        }
        setLoading(false);
        return;
      }
  
      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";
  
        let response;
        if (isAdmin) {
          response = await axios.get("http://127.0.0.1:8000/camera/", {
            headers: { accept: "application/json", Authorization: `Bearer ${token}` },
          });
        } else {
          const userId = decodedToken.id;
          const userResponse = await axios.get(`http://127.0.0.1:8000/users/${userId}`, {
            headers: { accept: "application/json", Authorization: `Bearer ${token}` },
          });
  
          const user = userResponse.data;
          if (!user || !user.cameras.length) {
            if (!toast.isActive("no-cameras")) {
              toast.error("No cameras assigned to this user.", { toastId: "no-cameras" });
            }
            setLoading(false);
            return;
          }
  
          response = { data: await fetchCameraDetails(user.cameras, token) };
        }
  
        setCameras(response.data);
        setSelectedCamera(response.data[0]?.id);
      } catch (error) {
        console.error("Error fetching cameras:", error);
        if (!toast.isActive("fetch-error")) {
          toast.error("Failed to fetch cameras. Please try again later.", { toastId: "fetch-error" });
        }
      } finally {
        setLoading(false);
      }
    };
  
    fetchCameras();
  }, []);
  


  //Fetch Alerts
  useEffect(() => {
    const fetchAlerts = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        console.error("No authentication token found!");
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";

        let alertUrls = [];

        if (isAdmin) {
          alertUrls = ["ws://localhost:8000/ws/alerts"]; // ✅ Single WebSocket for Admin
        } else {
        
          alertUrls = cameras.map((camera) => `ws://localhost:8000/ws/alerts/${camera.id}`);
        }

        console.log("Connecting to WebSockets:", alertUrls);

        // Fetch initial alerts (Filtered for users)
        const alertEndpoint = isAdmin
          ? "http://127.0.0.1:8000/alerts/"
          : `http://127.0.0.1:8000/alerts?camera_ids=${cameras.map((c) => c.id).join(",")}`;

        const response = await axios.get(alertEndpoint, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.length > 0) {
          const filteredAlerts = isAdmin
            ? response.data
            : response.data.filter((alert) => cameras.some((camera) => camera.id === alert.camera_id));

          setAlerts(filteredAlerts);
        }

        // Open WebSocket connections
        alertUrls.forEach((url) => {
          if (socketsRef.current[url]) {
            console.log(`🔄 WebSocket already connected: ${url}`);
            return; // Prevent duplicate WebSocket connections
          }

          const socket = new WebSocket(url);
          socketsRef.current[url] = socket; // Store reference

          socket.onopen = () => {
            console.log(`✅ WebSocket Connected: ${url}`);
          };

          socket.onmessage = (event) => {
            const newAlert = JSON.parse(event.data);
            console.log("🔔 New Alert Received:", newAlert); 
        
            // 🔍 Check if alert field exists and parse it
            let alertData;
            try {
                alertData = JSON.parse(newAlert.alert); // ✅ Parse the alert JSON string
            } catch (error) {
                console.error("❌ Failed to parse alert data:", newAlert.alert, error);
                return;
            }
        
            console.log("✅ Parsed Alert Data:", alertData);
        
            if (!alertData.file_path) {
                console.error("❌ Missing file_path in alertData:", alertData);
                return;
            }
        
            setAlerts((prevAlerts) => [alertData, ...prevAlerts]); // ✅ Use parsed alertData
        
            toast(`🚨 New Alert at Camera ${alertData.camera_id}`, {
                duration: 5000,
                position: "top-right",
                style: {
                    background: "#333",
                    color: "white",
                    cursor: "pointer",
                },
                onClick: () => handleToastClick(alertData.file_path, alertData.camera_id), // ✅ Use alertData.file_path
            });
        };
        
          
          

          socket.onerror = (error) => {
            console.error(`❌ WebSocket Error (${url}):`, error);
          };

          socket.onclose = () => {
            console.log(`⚠️ WebSocket Disconnected: ${url}`);
            delete socketsRef.current[url]; // Remove reference when closed
          };
        });
      } catch (error) {
        console.error("Error fetching alerts:", error);
      }
    };

    fetchAlerts();

    return () => {
      Object.values(socketsRef.current).forEach((socket) => socket.close());
    };
  }, [cameras]);

  // Runs only once when component mount

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
     // console.log("Selected Camera: ", cameraId);
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
        <FootTable alerts={alerts} setAlerts={setAlerts} />
      </div>
      {popupActive && (
        <FeedPopup filePath={alertUrl} onClose={handleClosePopup} />
      )}
    </div>
  );
};

export default Dashboard;
