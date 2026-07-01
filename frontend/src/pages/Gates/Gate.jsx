import React, { useEffect, useState, useCallback } from "react";
import FootFallRow from "../../components/FootFallRow/FootFallRow";
import "./Gate.css";
import VehicleTable from "../../components/VehicleTable/VehicleTable";
import { jwtDecode } from "jwt-decode";
import axios from "axios";
import { toast } from "react-toastify";
import BACKEND_URL from "../../config.js";
import { Chip, CircularProgress, Tooltip } from "@mui/material";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

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

  return (
    <div className="gate__main">
      <div className="gate__content">

        {/* ── Page header ──────────────────────────────────────────────────── */}
        <div className="gate__text__main" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", flexWrap: "wrap", gap: 12 }}>
          <div className="dashboard__text">
            <h1 className="gate__heading">Gate Vehicle Tracking</h1>
            <p style={{ color: "var(--muted)", fontSize: "14px", marginTop: "-10px", marginLeft: "31px" }}>
              Monitor and track vehicle entries with license plate recognition
            </p>
          </div>

          {!loading && cameras.length > 0 && (
            <div style={{ display: "flex", gap: 10, marginRight: 10 }}>
              <button
                onClick={startAllWorkers}
                disabled={allWorkersLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "var(--accent)", color: "var(--text)", border: "none",
                  borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
                  cursor: allWorkersLoading ? "default" : "pointer",
                  opacity: allWorkersLoading ? 0.6 : 1,
                  boxShadow: "0 4px 12px rgba(34,197,94,.3)",
                }}
              >
                {allWorkersLoading
                  ? <CircularProgress size={14} sx={{ color: "#fff" }} />
                  : <PlayArrowIcon sx={{ fontSize: 16 }} />}
                Start All Plate Cams
              </button>
              <button
                onClick={stopAllWorkers}
                disabled={allWorkersLoading}
                style={{
                  display: "flex", alignItems: "center", gap: 6,
                  background: "transparent", color: "var(--danger, #ef4444)", border: "1px solid var(--danger, #ef4444)",
                  borderRadius: 8, padding: "9px 16px", fontSize: 13, fontWeight: 600,
                  cursor: allWorkersLoading ? "default" : "pointer",
                  opacity: allWorkersLoading ? 0.6 : 1,
                }}
              >
                <StopIcon sx={{ fontSize: 16 }} />
                Stop All
              </button>
            </div>
          )}
        </div>


        {/* ── Camera status bar ────────────────────────────────────────────── */}
        {/* {!loading && cameras.length > 0 && (
          <div style={{
            display: "flex", flexWrap: "wrap", gap: 10, marginLeft: 10, marginBottom: 10,
          }}>
            {cameras.map((camera) => {
              const status = workerStatus[camera.id] || "stopped";
              return (
                <div
                  key={camera.id}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    backgroundColor: "var(--card-bg)", border: "1px solid var(--border)",
                    borderRadius: 10, padding: "8px 14px",
                  }}
                >
                  <CameraAltIcon sx={{ color: "var(--accent)", fontSize: 16 }} />
                  <span style={{ color: "var(--text)", fontSize: 13, fontWeight: 500 }}>
                    Cam {camera.id}
                  </span>
                  {camera.location && (
                    <span style={{ color: "var(--muted)", fontSize: 11 }}>({camera.location})</span>
                  )}

                  {/* Status chip */}
                  {/* <Chip
                    label={status === "running" ? "● Active" : status === "loading" ? "…" : "○ Idle"}
                    size="small"
                    sx={{
                      fontSize: 10, fontWeight: 700,
                      backgroundColor: status === "running" ? "#22c55e22" : status === "loading" ? "#f59e0b22" : "#374151",
                      color: status === "running" ? "#22c55e" : status === "loading" ? "#f59e0b" : "#6b7280",
                      border: `1px solid ${status === "running" ? "#22c55e" : status === "loading" ? "#f59e0b" : "#374151"}`,
                    }}
                  /> */}

                  {/* Start / Stop buttons */}
                  {/* {status === "loading" ? (
                    <CircularProgress size={14} sx={{ color: "#f59e0b" }} />
                  ) : status === "running" ? (
                    <Tooltip title="Stop LP detection">
                      <button
                        onClick={() => stopWorker(camera.id)}
                        style={{
                          background: "#ef444422", border: "1px solid #ef4444",
                          borderRadius: 6, color: "#ef4444", cursor: "pointer",
                          padding: "2px 8px", fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 3,
                        }}
                      >
                        <StopIcon sx={{ fontSize: 13 }} /> Stop
                      </button>
                    </Tooltip>
                  ) : (
                    <Tooltip title="Start LP detection">
                      <button
                        onClick={() => startWorker(camera.id)}
                        style={{
                          background: "#22c55e22", border: "1px solid #22c55e",
                          borderRadius: 6, color: "#22c55e", cursor: "pointer",
                          padding: "2px 8px", fontSize: 11, fontWeight: 600,
                          display: "flex", alignItems: "center", gap: 3,
                        }}
                      >
                        <PlayArrowIcon sx={{ fontSize: 13 }} /> Start
                      </button>
                    </Tooltip>
                  )}
                </div>
              );
            })}
          </div>
        )} */} 

        {/* ── Live camera feeds ─────────────────────────────────────────────── */}
        <div className="footfall__container" >
          <FootFallRow
            cameras={cameras}
            selectedCamera={selectedCamera}
            setSelectedCamera={setSelectedCamera}
            loading={loading}
          />
        </div>

        {/* ── Vehicle records table ─────────────────────────────────────────── */}
        <div style={{ marginTop: "30px", animation: "slideInUp 0.5s ease-out 0.2s both" }}>
          <VehicleTable selectedCameraId={selectedCamera} />
        </div>

      </div>
    </div>
  );
};

export default Gate;