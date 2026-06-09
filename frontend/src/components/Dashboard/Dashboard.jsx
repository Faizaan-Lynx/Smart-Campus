import React, { useEffect, useMemo, useRef, useState } from "react";
import "./Dashboard.css";
import BoxRow from "../BoxDataRow/BoxRow";
import FootFallRow from "../FootFallRow/FootFallRow";
import FootTable from "../FootTable/FootTable";
import { updateSelectedOption } from "../../redux/actions/authActions";
import { useDispatch } from "react-redux";
import axios from "axios";
import { color1, color2, color3 } from "../../utils";
import { useParams } from "react-router-dom";
import { toast } from "react-toastify";
import { LineChart, PieChart, BarChart } from "@mui/x-charts";
import FeedPopup from "../FootTable/FeedPopUp";
import { jwtDecode } from "jwt-decode";
import { useAlert } from "../../context/AlertContext";
import BACKEND_URL from '../../config.js';

const MONTH_LABELS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const CHART_COLORS = [
  "#e8534a",
  "#f5a623",
  "#4ecdc4",
  "#a8e063",
  "#c471ed",
  "#f64f59",
];

const AXIS_LABEL_COLOR = "#e2e8f0";
const AXIS_TICK_COLOR = "#cbd5e1";
const LEGEND_LABEL_COLOR = "#e2e8f0";

const parseAlertTimestamp = (timestamp) => {
  if (!timestamp) return null;
  const normalized = timestamp
    .replace(/,/g, "")
    .replace(/(\d{2})\/(\d{2})\/(\d{4})/, "$3-$2-$1")
    .replace(/(\d{2})-(\d{2})-(\d{4})/, "$3-$2-$1");
  const date = new Date(normalized);
  return isNaN(date.getTime()) ? null : date;
};

const getAlertType = (alert) => alert?.alert_type || alert?.type || "Intrusion";

const Dashboard = () => {
  const dispatch = useDispatch();

  const [loading, setLoading] = useState(false);

  const [popupActive, setPopupActive] = useState(false);

  // Camera Related Variables
  const [cameras, setCameras] = useState([]);

  const [selectedCamera, setSelectedCamera] = useState(null);
  const [usersWithCameraCount, setUsersWithCameraCount] = useState([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [usersError, setUsersError] = useState(null);
  // Alert Related Variables
  const { alerts, setAlerts, addToast, dismissAllToasts } = useAlert();
  const [alertUrl, setAlertUrl] = useState(null);
  const socketsRef = useRef({}); // Keep track of active WebSocket connections

  const handleClosePopup = () => {
    setPopupActive(false);
    setLoading(false);
  };

  //Start All Feeds
  useEffect(() => {
    const startFeeds = () => {
      console.log("▶️ Attempting to start feeds...");
      const token = localStorage.getItem("token");

      if (!token) {
        console.warn("🔒 No token found in localStorage.");
        return;
      }

      // axios
      //   .get("http://${BACKEND_URL}/intrusions/start_all_feed_workers", {
      //     headers: {
      //       accept: "application/json",
      //       Authorization: `Bearer ${token}`,
      //     },
      //   })
      //   .then((response) => {
      //     console.log("✅ API Response:", response.data);
      //     alert("Feeds started successfully");
      //   })
      //   .catch((error) => {
      //     console.error("❌ Failed to start feeds:", error);
      //     alert("Failed to start feeds. Check console for details.");
      //   });
    };
  }, []);

  // Fetch Cameras

  const fetchCameraDetails = async (cameraIds, token) => {
    const cameraPromises = cameraIds.map(async (cameraId) => {
      try {
        const response = await axios.get(
          `http://${BACKEND_URL}/camera/${cameraId}`,
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
          toast.error("No authentication token found!", {
            toastId: "token-error",
          });
        }
        setLoading(false);
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";

        let response;
        if (isAdmin) {
          response = await axios.get(`http://${BACKEND_URL}/camera/`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
        } else {
          const userId = decodedToken.id;
          const userResponse = await axios.get(
            `http://${BACKEND_URL}/users/${userId}`,
            {
              headers: {
                accept: "application/json",
                Authorization: `Bearer ${token}`,
              },
            }
          );

          const user = userResponse.data;
          if (!user || !user.cameras.length) {
            if (!toast.isActive("no-cameras")) {
              toast.error("No cameras assigned to this user.", {
                toastId: "no-cameras",
              });
            }
            setLoading(false);
            return;
          }

          response = { data: await fetchCameraDetails(user.cameras, token) };
        }


        const filteredCameras = response.data.filter(camera => camera.detect_intrusions === true);
        const sortedCameras = filteredCameras.sort((a, b) => a.id - b.id);
        setCameras(sortedCameras);

        setSelectedCamera(sortedCameras[0]?.id || null);
      } catch (error) {
        console.error("Error fetching cameras:", error);
        if (!toast.isActive("fetch-error")) {
          toast.error("Failed to fetch cameras. Please try again later.", {
            toastId: "fetch-error",
          });
        }
      } finally {
        setLoading(false);
      }
    };

    fetchCameras();

    const fetchUsersOverview = async () => {
      const token = localStorage.getItem("token");
      if (!token) {
        setUsersError("Missing authentication token.");
        setUsersLoading(false);
        return;
      }

      try {
        const decodedToken = jwtDecode(token);
        const isAdmin = decodedToken.role === "admin";
        let response;

        if (isAdmin) {
          response = await axios.get(`http://${BACKEND_URL}/users/`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          const allUsers = response.data.map((user) => ({
            label: user.username || `User ${user.id}`,
            count: Array.isArray(user.cameras) ? user.cameras.length : 0,
          }));
          console.log("Users with camera counts:", allUsers);
          setUsersWithCameraCount(allUsers);
        } else {
          response = await axios.get(`http://${BACKEND_URL}/users/${decodedToken.id}`, {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${token}`,
            },
          });
          setUsersWithCameraCount([
            {
              label: response.data.username || "My Cameras",
              count: response.data.cameras?.length || 0,
            },
          ]);
        }
      } catch (error) {
        console.error("Error fetching user camera counts:", error);
        setUsersError("Unable to load user camera assignments.");
      } finally {
        setUsersLoading(false);
      }
    };

    fetchUsersOverview();
  }, []);

  //Fetch Alerts
  useEffect(() => {
    // Only run if cameras are loaded (for non-admin users)
    if (cameras.length === 0) return;

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
          alertUrls = [`ws://${BACKEND_URL}/ws/alerts`];
        } else {
          if (cameras.length === 0) return; // Guard: don't open sockets if no cameras
          alertUrls = cameras.map(
            (camera) => `ws://${BACKEND_URL}/ws/alerts/${camera.id}`
          );
        }

        console.log("Connecting to WebSockets:", alertUrls);

        // Fetch initial alerts (Filtered for users)
        const alertEndpoint = isAdmin
          ? `http://${BACKEND_URL}/alerts/`
          : `http://${BACKEND_URL}/alerts?camera_id=${cameras
              .map((c) => c.id)
              .join(",")}`;

        const response = await axios.get(alertEndpoint, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        });

        if (response.data && response.data.length > 0) {
          const filteredAlerts = isAdmin
            ? response.data
            : response.data.filter((alert) =>
                cameras.some((camera) => camera.id === alert.camera_id)
              );

          const sortedFormattedAlerts = filteredAlerts
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
            .map((item) => {
              const utcDate = new Date(item.timestamp + "Z");
              return {
                ...item,
                timestamp: utcDate.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }),
              };
            });

          setAlerts(sortedFormattedAlerts);
        }

        // Open WebSocket connections
        alertUrls.forEach((url) => {
          if (socketsRef.current[url]) {
            console.log(`🔄 WebSocket already connected: ${url}`);
            return;
          }

          const socket = new WebSocket(url);
          socketsRef.current[url] = socket;

          socket.onopen = () => {
            console.log(`✅ WebSocket Connected: ${url}`);
          };

          socket.onmessage = (event) => {
            const newAlert = JSON.parse(event.data);
            console.log("🔔 New Alert Received:", newAlert);

            let alertData;
            try {
              alertData = JSON.parse(newAlert.alert);
              console.log("📋 Parsed Alert Data:", alertData);
            } catch (error) {
              console.error(
                "❌ Failed to parse alert data:",
                newAlert.alert,
                error
              );
              return;
            }

            const utcDate = new Date(alertData.timestamp + "Z");
            alertData.timestamp = utcDate.toLocaleString("en-GB", {
              day: "2-digit",
              month: "short",
              year: "numeric",
              hour: "2-digit",
              minute: "2-digit",
              hour12: true,
            });

            if (!alertData.file_path) {
              console.error("❌ Missing file_path in alertData:", alertData);
              return;
            }

            setAlerts((prevAlerts) => [alertData, ...prevAlerts]);

            // Find camera location for toast
            const cam = cameras.find(c => c.id === alertData.camera_id);
            const locationText = cam && cam.location ? cam.location : `Camera ${alertData.camera_id}`;
            addToast(`🚨 New Alert at ${locationText}`, {
              onClick: () =>
                handleToastClick(newAlert.id || alertData.id || alertData.file_path, alertData.camera_id),
            });
          };

          socket.onerror = (error) => {
            console.error(`❌ WebSocket Error (${url}):`, error);
          };

          socket.onclose = () => {
            console.log(`⚠️ WebSocket Disconnected: ${url}`);
            delete socketsRef.current[url];
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

  const handleToastClick = async (alertId, cameraId) => {
    console.log("handleToastClick called with Alert ID:", alertId, "Camera ID:", cameraId);

    if (!alertId) {
      console.error(`Error: No alert ID received for Camera ID: ${cameraId}`);
      toast.error(`No valid alert data for Camera ${cameraId}`);
      return;
    }

    setLoading(true);
    setSelectedCamera(cameraId);

    try {
      const token = localStorage.getItem("token");

      const response = await axios.get(`http://${BACKEND_URL}/alerts/${alertId}/image`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob', // Expecting the response to be a blob (image)
      });

      if (response.headers["content-type"]?.startsWith("image/")) {
        console.log("Image blob received", response.data);
        setAlertUrl(response.data); // Set the blob directly to state
        setPopupActive(true);
      } else {
        const errorText = await response.data.text();
        console.error("Expected image, got:", errorText);
        toast.error(`Failed to load image for Camera ${cameraId}`);
      }
    } catch (error) {
      console.error("Error fetching the image:", error);
      toast.error(`Failed to load image for Camera ${cameraId}`);
    } finally {
      setLoading(false);
    }
  };

  const monthlyAlertsChart = useMemo(() => {
    const monthCounts = Array(12).fill(0);
    const typeBuckets = {};

    alerts.forEach((alert) => {
      const date = parseAlertTimestamp(alert.timestamp);
      if (!date) return;
      const monthIndex = date.getMonth();
      const type = getAlertType(alert);
      monthCounts[monthIndex] += 1;

      if (!typeBuckets[type]) {
        typeBuckets[type] = Array(12).fill(0);
      }
      typeBuckets[type][monthIndex] += 1;
    });

    const series = Object.entries(typeBuckets).length > 1
      ? Object.entries(typeBuckets).map(([type, data]) => ({
          label: type,
          data,
          curve: "natural",
          showMark: true,
        }))
      : [
          {
            label: "Alerts",
            data: monthCounts,
            curve: "natural",
            showMark: true,
          },
        ];

    return {
      categories: MONTH_LABELS,
      series,
    };
  }, [alerts]);

  const cameraAlertAnalytics = useMemo(() => {
    const counts = {};
    alerts.forEach((alert) => {
      const cameraId = Number(alert.camera_id);
      counts[cameraId] = (counts[cameraId] || 0) + 1;
    });

    return Object.entries(counts)
      .map(([cameraId, total]) => {
        const camera = cameras.find((item) => item.id === Number(cameraId));
        return {
          cameraId: Number(cameraId),
          label: camera?.location || `Camera ${cameraId}`,
          total,
        };
      })
      .sort((a, b) => b.total - a.total);
  }, [alerts, cameras]);

  const cameraRows = useMemo(
    () => cameraAlertAnalytics.map((item) => item.label),
    [cameraAlertAnalytics]
  );

  const cameraCounts = useMemo(
    () => cameraAlertAnalytics.map((item) => item.total),
    [cameraAlertAnalytics]
  );

  const usersPieSeries = useMemo(() => {
    return [
      {
        data: usersWithCameraCount.map((user, index) => ({
          id: index,
          value: user.count,
          label: user.label,
        })),
      },
    ];
  }, [usersWithCameraCount]);

  const totalAssignedCameras = useMemo(
    () => usersWithCameraCount.reduce((sum, user) => sum + user.count, 0),
    [usersWithCameraCount]
  );

  const recentAlerts = useMemo(
    () => alerts.slice(0, 8),
    [alerts]
  );

  return (
    <div className="dashboard__main">
      {/* <ToastContainer ... /> removed, now global */}

      <div className="dashboard__content">
        <div className="dashboard__text__main">
          <div className="dashboard__text">
            <p className="dash__text">Main Dashboard</p>
          </div>
        </div>
        <BoxRow alerts={alerts} />
        <FootFallRow
          cameras={cameras}
          selectedCamera={selectedCamera} // Pass selectedCamera
          setSelectedCamera={setSelectedCamera} // Pass setter function
          loading={loading}
        />
        <div className="dashboard__analytics-grid">
          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h3>Monthly Alerts</h3>
                <p className="dashboard-card__subtitle">Alerts generated by month</p>
              </div>
            </div>
            <div className="dashboard-card__body">
              {alerts.length === 0 ? (
                <div className="dashboard-empty-state">No alerts available yet.</div>
              ) : (
                <LineChart
                  xAxis={[{ data: monthlyAlertsChart.categories, scaleType: "band" }]}
                  series={monthlyAlertsChart.series}
                  colors={CHART_COLORS}
                  height={320}
                  grid={{ horizontal: true }}
                  sx={{
                    "& .MuiChartsAxis-tickLabel": { fill: "#cbd5e1 !important" },
                    "& .MuiChartsAxis-label": { fill: "#e2e8f0 !important" },
                    "& .MuiChartsAxis-line": { stroke: "#334155" },
                    "& .MuiChartsAxis-tick": { stroke: "#334155" },
                    "& .MuiChartsGrid-line": {
                      stroke: "rgba(255,255,255,0.12)",
                      strokeDasharray: "4 4",
                    },
                  }}
                  slotProps={{
                    legend: {
                      position: { vertical: "bottom", horizontal: "center" },
                      direction: "row",
                      itemMarkHeight: 10,
                      itemMarkWidth: 10,
                      itemSpacing: 10,
                      padding: -5,
                    
                      labelStyle: { fontSize: 13, fill: LEGEND_LABEL_COLOR, },
                    },
                    xAxis: {
                  
                      labelStyle: { fill: AXIS_LABEL_COLOR, fontSize: 12 },
                      tickLabelStyle: { fill: AXIS_TICK_COLOR, fontSize: 11 },
                    },
                    yAxis: {
                      labelStyle: { fill: AXIS_LABEL_COLOR, fontSize: 12 },
                      tickLabelStyle: { fill: AXIS_TICK_COLOR, fontSize: 11 },
                    },
                    tooltip: {
                      formatter: ({ x, y, seriesName }) => ({
                        title: `${seriesName} • ${x}`,
                        label: `${y} alert${y === 1 ? "" : "s"}`,
                      }),
                    },
                  }}
                />
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h3>Users by Cameras</h3>
                <p className="dashboard-card__subtitle">Cameras assigned per user</p>
              </div>
            </div>
            <div className="dashboard-card__body dashboard-card__body--pie">
              {usersLoading ? (
                <div className="dashboard-empty-state">Loading users...</div>
              ) : usersError ? (
                <div className="dashboard-empty-state">{usersError}</div>
              ) : usersWithCameraCount.length === 0 ? (
                <div className="dashboard-empty-state">No user assignments found.</div>
              ) : (
                <>
                  <PieChart
                    width={340}
                    height={300}
                    colors={CHART_COLORS}
                    series={[
                      {
                        data: usersWithCameraCount
                          .map((user, index) => ({
                            id: index,
                            value: user.count,
                            label: user.label,
                            color: CHART_COLORS[index % CHART_COLORS.length],
                          })),
                        arcLabel: (item) => `${item.value}`,
                        arcLabelMinAngle: 35,
                        innerRadius: 55,
                        outerRadius: 110,
                        paddingAngle: 3,
                        cornerRadius: 5,
                        cx: 155,
                        cy: 140,
                      },
                    ]}
                    sx={{
                      "& .MuiChartsArcLabel-root": {
                        fill: "#ffffff",
                        fontWeight: 700,
                        fontSize: "0.72rem",
                        textShadow: "0 1px 4px rgba(0,0,0,0.8)",
                      },
                    }}
                    slotProps={{
                      legend: { hidden: true },
                    }}
                  />
                  <div className="dashboard-pie-center">
                    <strong style={{ color: "#ffffff", fontSize: "1.6rem" }}>{totalAssignedCameras}</strong>
                  </div>
                </>
              )}
            </div>
          </section>

          <section className="dashboard-card">
            <div className="dashboard-card__header">
              <div>
                <h3>Alerts by Camera</h3>
                <p className="dashboard-card__subtitle">Volume per camera location</p>
              </div>
            </div>
            <div className="dashboard-card__body dashboard-card__body--scroll">
              {cameraAlertAnalytics.length === 0 ? (
                <div className="dashboard-empty-state">No camera alerts to display.</div>
              ) : (
                <div className="dashboard-chart-scroll-inner">
                  <BarChart
                    height={320}
                    series={[{
                      data: cameraCounts,
                      label: "Alerts",
                      color: "#e8534a",
                    }]}
                    xAxis={[{ data: cameraRows, scaleType: "band" }]}
                    grid={{ horizontal: true }}
                    sx={{
                      "& .MuiChartsAxis-tickLabel": { fill: "#cbd5e1 !important" },
                      "& .MuiChartsAxis-label": { fill: "#e2e8f0 !important" },
                      "& .MuiChartsAxis-line": { stroke: "#334155" },
                      "& .MuiChartsAxis-tick": { stroke: "#334155" },
                      "& .MuiChartsGrid-line": {
                        stroke: "rgba(255,255,255,0.12)",
                        strokeDasharray: "4 4",
                      },
                    }}
                    slotProps={{
                      legend: {
                        position: { vertical: "bottom", horizontal: "center" },
                        direction: "row",
                        itemMarkHeight: 10,
                        itemMarkWidth: 10,
                        padding: -5,
                        labelStyle: { fontSize: 13, fill: LEGEND_LABEL_COLOR },
                      },
                      xAxis: {
                        labelStyle: { fill: AXIS_LABEL_COLOR, fontSize: 12 },
                        tickLabelStyle: { fill: AXIS_TICK_COLOR, fontSize: 11 },
                      },
                      yAxis: {
                        labelStyle: { fill: AXIS_LABEL_COLOR, fontSize: 12 },
                        tickLabelStyle: { fill: AXIS_TICK_COLOR, fontSize: 11 },
                      },
                      tooltip: {
                        formatter: ({ x, y }) => ({
                          title: `${x}`,
                          label: `${y} alert${y === 1 ? "" : "s"}`,
                        }),
                      },
                    }}
                  />
                </div>
              )}
            </div>
          </section>

          <section className="dashboard-card dashboard-card--table">
            <div className="dashboard-card__header">
              <div>
                <h3>Recent Alerts</h3>
                <p className="dashboard-card__subtitle">Latest camera alerts and actions</p>
              </div>
            </div>
            <div className="dashboard-card__body dashboard-card__body--table">
              <FootTable
                alerts={recentAlerts}
                setAlerts={setAlerts}
                cameras={cameras}
              />
            </div>
          </section>
        </div>
      </div>
      {popupActive && (
        <FeedPopup 
          filePath={alertUrl} 
          onClose={handleClosePopup}
          location={(() => {
            const cam = cameras.find(c => c.id === selectedCamera);
            return cam && cam.location ? cam.location : `Camera ${selectedCamera}`;
          })()}
        />
      )}
    </div>
  );
};

export default Dashboard;