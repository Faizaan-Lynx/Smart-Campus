import React, { useEffect, useState, useCallback } from "react";
import FootFallRow from "../../components/FootFallRow/FootFallRow";
import "./Gate.css";
import VehicleTable from "../../components/VehicleTable/VehicleTable";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "react-toastify";
import BACKEND_URL from "../../config.js";
import { CircularProgress, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import DirectionsCarFilledIcon from "@mui/icons-material/DirectionsCarFilled";
import VideocamOffIcon from "@mui/icons-material/VideocamOff";
import ListAltIcon from "@mui/icons-material/ListAlt";

const Gate = () => {
  const [cameras, setCameras] = useState([]);
  const [selectedCamera, setSelectedCamera] = useState(null);
  const [loading, setLoading] = useState(true);
  const [workerStatus, setWorkerStatus] = useState({}); // { [cameraId]: "running" | "stopped" | "loading" }

  // ── Fetch cameras (gate cameras only: detect_intrusions === false) ──────────
  const fetchCameraDetails = async (cameraIds, token) => {
    const results = await Promise.all(
      cameraIds.map(async (id) => {
        try {
          const res = await axios.get(`http://${BACKEND_URL}/camera/${id}`, {
            headers: { accept: "application/json", Authorization: `Bearer ${token}` },
          });
          return res.data;
        } catch {
          return null;
        }
      })
    );
    return results.filter(Boolean);
  };

  const fetchCameras = useCallback(async () => {
    const token = localStorage.getItem("token");
    if (!token) {
      toast.error("No authentication token found!", { toastId: "token-error" });
      setLoading(false);
      return;
    }

    try {
      const decoded = jwtDecode(token);
      const isAdmin = decoded.role === "admin";

      let allCameras;
      if (isAdmin) {
        const res = await axios.get(`http://${BACKEND_URL}/camera/`, {
          headers: { accept: "application/json", Authorization: `Bearer ${token}` },
        });
        allCameras = res.data;
      } else {
        const userRes = await axios.get(`http://${BACKEND_URL}/users/${decoded.id}`, {
          headers: { accept: "application/json", Authorization: `Bearer ${token}` },
        });
        const user = userRes.data;
        if (!user?.cameras?.length) {
          toast.error("No cameras assigned to this user.", { toastId: "no-cameras" });
          setLoading(false);
          return;
        }
        allCameras = await fetchCameraDetails(user.cameras, token);
      }

      // Gate page only shows cameras where detect_intrusions = false
      const gateCameras = allCameras
        .filter((c) => c.detect_intrusions === false)
        .sort((a, b) => a.id - b.id);

      setCameras(gateCameras);
      setSelectedCamera(gateCameras[0]?.id || null);
    } catch (error) {
      console.error("Error fetching cameras:", error);
      toast.error("Failed to fetch cameras.", { toastId: "fetch-error" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchCameras(); }, [fetchCameras]);

  // ── LP Worker controls (per-camera, from this page) ───────────────────────
  const token = localStorage.getItem("token");

  const startWorker = async (cameraId) => {
    setWorkerStatus((prev) => ({ ...prev, [cameraId]: "loading" }));
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/start_worker/${cameraId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkerStatus((prev) => ({ ...prev, [cameraId]: "running" }));
      toast.success(`LP detection started for Camera ${cameraId}`);
    } catch {
      setWorkerStatus((prev) => ({ ...prev, [cameraId]: "stopped" }));
      toast.error(`Failed to start LP detection for Camera ${cameraId}`);
    }
  };

  const stopWorker = async (cameraId) => {
    setWorkerStatus((prev) => ({ ...prev, [cameraId]: "loading" }));
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/stop_worker/${cameraId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkerStatus((prev) => ({ ...prev, [cameraId]: "stopped" }));
      toast.info(`LP detection stopped for Camera ${cameraId}`);
    } catch {
      setWorkerStatus((prev) => ({ ...prev, [cameraId]: "running" }));
      toast.error(`Failed to stop LP detection for Camera ${cameraId}`);
    }
  };

  // ── Start/Stop ALL gate cameras at once (mirrors intrusion start-all) ──────
  const [allWorkersLoading, setAllWorkersLoading] = useState(false);

  const startAllWorkers = async () => {
    setAllWorkersLoading(true);
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/start_all_workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Optimistically mark every gate camera as running; the worker itself
      // will skip any camera that has detect_intrusions=True.
      setWorkerStatus((prev) => {
        const next = { ...prev };
        cameras.forEach((c) => { next[c.id] = "running"; });
        return next;
      });
      toast.success("License plate detection started on all gate cameras");
    } catch {
      toast.error("Failed to start all LP workers");
    } finally {
      setAllWorkersLoading(false);
    }
  };

  const stopAllWorkers = async () => {
    setAllWorkersLoading(true);
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/stop_all_workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setWorkerStatus((prev) => {
        const next = { ...prev };
        cameras.forEach((c) => { next[c.id] = "stopped"; });
        return next;
      });
      toast.info("License plate detection stopped on all gate cameras");
    } catch {
      toast.error("Failed to stop all LP workers");
    } finally {
      setAllWorkersLoading(false);
    }
  };

  const runningCount = cameras.filter((c) => workerStatus[c.id] === "running").length;

  return (
    <div className="gate__main">
      <div className="gate__content">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="gate__header">
          <div className="gate__header-left">
            {/* <span className="gate__heading-icon">
              <DirectionsCarFilledIcon sx={{ fontSize: 22 }} />
            </span> */}
            <div className="dashboard__text">
              <h1 className="gate__heading">Gate Vehicle Tracking</h1>
              <p className="gate__subheading">
                Monitor and track vehicle entries with license plate recognition
              </p>
            </div>
          </div>

          {!loading && cameras.length > 0 && (
            <div className="gate__header-right">
              {runningCount > 0 && (
                <span className="gate__live-pill">
                  <span className="gate__live-dot" />
                  {runningCount} of {cameras.length} active
                </span>
              )}
              <div className="gate__actions">
                <Tooltip title="Start license plate detection on every gate camera">
                  <button
                    onClick={startAllWorkers}
                    disabled={allWorkersLoading}
                    className="gate__btn gate__btn--start"
                  >
                    {allWorkersLoading
                      ? <CircularProgress size={14} sx={{ color: "inherit" }} />
                      : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                    Start All
                  </button>
                </Tooltip>
                <Tooltip title="Stop license plate detection on every gate camera">
                  <button
                    onClick={stopAllWorkers}
                    disabled={allWorkersLoading}
                    className="gate__btn gate__btn--stop"
                  >
                    {allWorkersLoading
                      ? <CircularProgress size={14} sx={{ color: "inherit" }} />
                      : <StopIcon sx={{ fontSize: 16 }} />}
                    Stop All
                  </button>
                </Tooltip>
              </div>
            </div>
          )}
        </div>

        {/* ── Live camera feeds ─────────────────────────────────────────────── */}
        <div className="gate__section-label">
          <span className="gate__section-label-bar" />
          Live Feeds
        </div>
        <div className="footfall__container">
          {!loading && cameras.length === 0 ? (
            <div className="gate__empty-state">
              <VideocamOffIcon sx={{ fontSize: 32, opacity: 0.5 }} />
              <p>No gate cameras assigned yet.</p>
              <span>Ask an administrator to assign a camera to this gate.</span>
            </div>
          ) : (
            <FootFallRow
              cameras={cameras}
              selectedCamera={selectedCamera}
              setSelectedCamera={setSelectedCamera}
              loading={loading}
            />
          )}
        </div>

        {/* ── Vehicle records table (all license plate cameras) ─────────────── */}
        <div className="gate__section-label" style={{ marginTop: 34 }}>
          <span className="gate__section-label-bar" />
          <ListAltIcon sx={{ fontSize: 16, marginRight: "4px" }} />
          Vehicle Records
        </div>
        <div className="gate__table-wrap">
          <VehicleTable cameras={cameras} />
        </div>

      </div>
    </div>
  );
};

export default Gate;