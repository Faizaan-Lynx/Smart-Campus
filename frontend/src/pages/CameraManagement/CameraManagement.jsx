import React, { useState, useEffect, useRef } from "react";
import "./CameraManagement.css";
import axios from "axios";
import { localurl } from "../../utils";
import BACKEND_URL from "../../config.js";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Box, Modal, TextField, Button, Grid, IconButton,
  Table, TableBody, TableCell, TableContainer, TableHead,
  TableRow, Paper, Dialog, DialogTitle, DialogContent,
  DialogActions, Chip, Tooltip, CircularProgress,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import PlayArrowIcon from "@mui/icons-material/PlayArrow";
import StopIcon from "@mui/icons-material/Stop";
import PointDrawingCanvas from "../../components/PointDrawingCanvas/PointDrawingCanvas";

const CameraManagement = () => {
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState(null);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [drawnPoints, setDrawnPoints] = useState([]);
  const [workerLoadingId, setWorkerLoadingId] = useState(null); // per-camera LP worker toggle

  // ── Live feed layout preference (Grid / Horizontal) ──────────────────────
  // This drives how camera feeds render in FootFallRow on the Dashboard and
  // Gate pages, via a shared localStorage key.
  const [layoutView, setLayoutView] = useState("horizontal");

  useEffect(() => {
    const savedLayout = localStorage.getItem("cameraLayoutView") || "horizontal";
    setLayoutView(savedLayout);
  }, []);

  const handleToggleLayout = (newLayout) => {
    setLayoutView(newLayout);
    localStorage.setItem("cameraLayoutView", newLayout);
  };

  const urlRef = useRef(null);
  const locationRef = useRef(null);
  const thresholdRef = useRef(null);
  const resizeDimsRef = useRef(null);
  const cropRegionRef = useRef(null);
  const detectIntrusionsRef = useRef(null);

  const token = localStorage.getItem("token");

  const [videoFrame, setVideoFrame] = useState(null);
  const [frameLoading, setFrameLoading] = useState(false);
  const [frameError, setFrameError] = useState(null);

  // ── Frame fetch for drawing modal ──────────────────────────────────────────
  const fetchFrameForDrawing = async () => {
    setVideoFrame(null);
    setFrameError(null);
    setFrameLoading(true);
    try {
      let url;
      if (currentCamera?.id) {
        url = `${localurl}/camera/${currentCamera.id}/frame`;
      } else {
        const rawUrl = urlRef.current?.value;
        if (!rawUrl) {
          setFrameError("Enter a Camera URL above first, then open the drawing tool.");
          setFrameLoading(false);
          return;
        }
        url = `${localurl}/camera/preview-frame?url=${encodeURIComponent(rawUrl)}`;
      }
      const response = await axios.get(url, {
        responseType: "blob",
        headers: { Authorization: `Bearer ${token}` },
      });
      setVideoFrame((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(response.data);
      });
    } catch (err) {
      setFrameError("Could not load camera frame. Check the URL and stream availability.");
    } finally {
      setFrameLoading(false);
    }
  };

  // ── Cameras fetch ───────────────────────────────────────────────────────────
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${localurl}/camera/`, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      });
      setCameras(response.data);
    } catch (error) {
      toast.error("Failed to fetch cameras");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCameras(); }, []);

  // ── LP Worker controls ──────────────────────────────────────────────────────
  const startLPWorker = async (cameraId) => {
    setWorkerLoadingId(cameraId);
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/start_worker/${cameraId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success(`License plate detection started for Camera ${cameraId}`);
    } catch (err) {
      toast.error(`Failed to start LP worker for Camera ${cameraId}`);
    } finally {
      setWorkerLoadingId(null);
    }
  };

  const stopLPWorker = async (cameraId) => {
    setWorkerLoadingId(cameraId);
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/stop_worker/${cameraId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.info(`License plate detection stopped for Camera ${cameraId}`);
    } catch (err) {
      toast.error(`Failed to stop LP worker for Camera ${cameraId}`);
    } finally {
      setWorkerLoadingId(null);
    }
  };

  const startAllLPWorkers = async () => {
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/start_all_workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.success("All license plate workers started");
    } catch (err) {
      toast.error("Failed to start all LP workers");
    }
  };

  const stopAllLPWorkers = async () => {
    try {
      await axios.get(`http://${BACKEND_URL}/license-plates/stop_all_workers`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      toast.info("All license plate workers stopped");
    } catch (err) {
      toast.error("Failed to stop all LP workers");
    }
  };

  // ── Add / Update / Delete ───────────────────────────────────────────────────
  const handleAddCamera = async () => {
    if (!urlRef.current?.value) { toast.error("Camera URL is required"); return; }
    try {
      const cameraData = {
        url: urlRef.current.value,
        location: locationRef.current?.value || null,
        detection_threshold: parseInt(thresholdRef.current?.value || 50),
        resize_dims: resizeDimsRef.current?.value || null,
        crop_region: cropRegionRef.current?.value || null,
        lines: formatPointsToString(drawnPoints),
        detect_intrusions: detectIntrusionsRef.current?.checked ?? true,
      };
      await axios.post(`${localurl}/camera/`, cameraData, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      });
      toast.success("Camera added successfully");
      setShowAddModal(false);
      setDrawnPoints([]);
      clearForm();
      fetchCameras();
    } catch (error) {
      toast.error("Failed to add camera");
    }
  };

  const handleUpdateCamera = async () => {
    if (!currentCamera) return;
    try {
      const cameraData = {
        url: urlRef.current.value,
        location: locationRef.current?.value || null,
        detection_threshold: parseInt(thresholdRef.current?.value || 50),
        resize_dims: resizeDimsRef.current?.value || null,
        crop_region: cropRegionRef.current?.value || null,
        lines: formatPointsToString(drawnPoints),
        detect_intrusions: detectIntrusionsRef.current?.checked ?? true,
      };
      await axios.put(`${localurl}/camera/${currentCamera.id}`, cameraData, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      });
      toast.success("Camera updated successfully");
      setShowEditModal(false);
      setDrawnPoints([]);
      fetchCameras();
    } catch (error) {
      toast.error("Failed to update camera");
    }
  };

  const handleDeleteCamera = async () => {
    if (!cameraToDelete) return;
    try {
      await axios.delete(`${localurl}/camera/${cameraToDelete.id}`, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
      });
      toast.success("Camera deleted successfully");
      setShowDeleteDialog(false);
      setCameraToDelete(null);
      fetchCameras();
    } catch (error) {
      toast.error("Failed to delete camera");
    }
  };

  const openEditModal = (camera) => {
    setCurrentCamera(camera);
    setDrawnPoints([]);
    setTimeout(() => {
      if (urlRef.current) urlRef.current.value = camera.url;
      if (locationRef.current) locationRef.current.value = camera.location || "";
      if (thresholdRef.current) thresholdRef.current.value = camera.detection_threshold;
      if (resizeDimsRef.current) resizeDimsRef.current.value = camera.resize_dims || "";
      if (cropRegionRef.current) cropRegionRef.current.value = camera.crop_region || "";
      if (detectIntrusionsRef.current) detectIntrusionsRef.current.checked = camera.detect_intrusions;
    }, 0);
    setShowEditModal(true);
  };

  const openAddModal = () => {
    setCurrentCamera(null);
    setDrawnPoints([]);
    clearForm();
    setShowAddModal(true);
  };

  const clearForm = () => {
    if (urlRef.current) urlRef.current.value = "";
    if (locationRef.current) locationRef.current.value = "";
    if (thresholdRef.current) thresholdRef.current.value = 50;
    if (resizeDimsRef.current) resizeDimsRef.current.value = "";
    if (cropRegionRef.current) cropRegionRef.current.value = "";
    if (detectIntrusionsRef.current) detectIntrusionsRef.current.checked = true;
  };

  const formatPointsToString = (polygons) => {
    if (!polygons || polygons.length === 0) return "";
    const inner = polygons.map((polygon) => polygon.map((p) => `(${p[0]},${p[1]})`).join(","));
    return `[${inner.map((p) => `[${p}]`).join(",")}]`;
  };

  const parsePointsFromString = (pointsStr) => {
    if (!pointsStr) return "";
    try {
      const cleaned = pointsStr.replace(/\(/g, "[").replace(/\)/g, "]");
      JSON.parse(cleaned);
      return pointsStr;
    } catch { return pointsStr; }
  };

  const modalStyle = {
    position: "absolute", top: "50%", left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%", maxWidth: 800, maxHeight: "90vh",
    bgcolor: "background.paper", borderRadius: 1, boxShadow: 24,
    p: 4, overflowY: "auto",
  };

  if (loading) {
    return (
      <div className="camera-management-container">
        <p>Loading cameras...</p>
      </div>
    );
  }

  return (
    <div className="dashboard__main">
      <div className="camera-management-container">
        <ToastContainer position="top-right" autoClose={3000} />

        <div className="camera-header">
          <h1>Cam Control</h1>
          <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
            {/* ── Global LP worker controls ── */}
            <Tooltip title="Start license plate detection on ALL cameras">
                <Button
                variant="contained"
                size="small"
                startIcon={<PlayArrowIcon />}
                onClick={startAllLPWorkers}
                sx={{
                  backgroundColor: "var(--accent)", fontSize: 12, fontWeight: 600,
                  "&:hover": { backgroundColor: "#16a34a" },
                }}
              >
                Start All LP
              </Button>
            </Tooltip>
            <Tooltip title="Stop license plate detection on ALL cameras">
                <Button
                variant="outlined"
                size="small"
                startIcon={<StopIcon />}
                onClick={stopAllLPWorkers}
                sx={{
                  borderColor: "var(--danger, #ef4444)", color: "var(--danger, #ef4444)", fontSize: 12, fontWeight: 600,
                  "&:hover": { borderColor: "#dc2626", color: "#dc2626", backgroundColor: "#fef2f2" },
                }}
              >
                Stop All LP
              </Button>
            </Tooltip>
            <button className="btn-primary" onClick={openAddModal}>
              + Add Camera
            </button>
          </div>
        </div>

        {/* ── Live feed layout toggle (moved here from Dashboard / Gate) ──── */}
        <div className="cam-control-panel">
          <div className="cam-control-panel__title">Feed Layout</div>
          <div className="cam-control-panel__actions">
            <button
              className={`toggle-btn ${layoutView === "grid" ? "active" : ""}`}
              onClick={() => handleToggleLayout("grid")}
              title="Switch live feeds to Grid View"
            >
              <span>⊞ Grid</span>
            </button>
            <button
              className={`toggle-btn ${layoutView === "horizontal" ? "active" : ""}`}
              onClick={() => handleToggleLayout("horizontal")}
              title="Switch live feeds to Horizontal View"
            >
              <span>→ Horizontal</span>
            </button>
          </div>
        </div>

        {cameras.length === 0 ? (
          <div className="no-cameras">
            <p>No cameras configured yet. Click "Add Camera" to get started.</p>
          </div>
        ) : (
          <TableContainer component={Paper} className="cameras-table">
            <Table>
              <TableHead>
                <TableRow style={{ backgroundColor: "var(--card-bg)" }}>
                    <TableCell style={{ color: "var(--text)", fontSize: "13px", borderColor: "var(--border)" }}><strong>ID</strong></TableCell>
                    <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}><strong>URL</strong></TableCell>
                    <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}><strong>Location</strong></TableCell>
                    <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}><strong>Threshold</strong></TableCell>
                    <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}><strong>Mode</strong></TableCell>
                    <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }} align="center"><strong>LP Detection</strong></TableCell>
                    <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }} align="center"><strong>Actions</strong></TableCell>
                  </TableRow>
              </TableHead>
              <TableBody>
                {cameras.map((camera) => {
                  const isGateCamera = !camera.detect_intrusions;
                  const isWorkerLoading = workerLoadingId === camera.id;

                  return (
                    <TableRow key={camera.id} style={{ backgroundColor: "var(--card-bg)" }}>
                      <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}>{camera.id}</TableCell>
                      <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }} className="url-cell">{camera.url}</TableCell>
                      <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}>{camera.location || "-"}</TableCell>
                      <TableCell style={{ color: "var(--text)", borderColor: "var(--border)" }}>{camera.detection_threshold}</TableCell>

                      {/* Mode badge */}
                      <TableCell style={{ borderColor: "var(--border)" }}>
                        {camera.detect_intrusions ? (
                          <Chip label="Intrusion" size="small" sx={{ backgroundColor: "#7c3aed22", color: "#a78bfa", border: "1px solid #7c3aed", fontWeight: 600, fontSize: 11 }} />
                        ) : (
                          <Chip label="Gate / LP" size="small" sx={{ backgroundColor: "#0284c722", color: "#38bdf8", border: "1px solid #0284c7", fontWeight: 600, fontSize: 11 }} />
                        )}
                      </TableCell>

                      {/* LP Worker start/stop — only visible for Gate cameras */}
                      <TableCell align="center" style={{ borderColor: "var(--border)" }}>
                        {isGateCamera ? (
                          <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
                            <Tooltip title="Start license plate detection">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => startLPWorker(camera.id)}
                                  disabled={isWorkerLoading}
                                  sx={{ color: "var(--accent)", "&:hover": { backgroundColor: "#22c55e22" } }}
                                >
                                  {isWorkerLoading ? <CircularProgress size={16} sx={{ color: "#22c55e" }} /> : <PlayArrowIcon fontSize="small" />}
                                </IconButton>
                              </span>
                            </Tooltip>
                            <Tooltip title="Stop license plate detection">
                              <span>
                                <IconButton
                                  size="small"
                                  onClick={() => stopLPWorker(camera.id)}
                                  disabled={isWorkerLoading}
                                  sx={{ color: "var(--danger, #ef4444)", "&:hover": { backgroundColor: "#ef444422" } }}
                                >
                                  <StopIcon fontSize="small" />
                                </IconButton>
                              </span>
                            </Tooltip>
                          </div>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 11 }}>N/A</span>
                        )}
                      </TableCell>

                      {/* Edit / Delete */}
                      <TableCell align="center" style={{ borderColor: "var(--border)" }}>
                        <IconButton size="small" color="primary" onClick={() => openEditModal(camera)} title="Edit Camera">
                          <EditIcon />
                        </IconButton>
                        <IconButton size="small" color="error" onClick={() => { setCameraToDelete(camera); setShowDeleteDialog(true); }} title="Delete Camera">
                          <DeleteIcon />
                        </IconButton>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}

        {/* ── Add Camera Modal ──────────────────────────────────────────────── */}
        <Modal open={showAddModal} onClose={() => setShowAddModal(false)}>
          <Box sx={modalStyle}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <h2>Add New Camera</h2>
              <IconButton onClick={() => { setShowAddModal(false); setDrawnPoints([]); }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Camera URL (RTSP/HTTP)" inputRef={urlRef} placeholder="rtsp://user:pass@192.168.1.1:554" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Location" inputRef={locationRef} placeholder="e.g., Main Gate" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Detection Threshold (0-100)" type="number" inputRef={thresholdRef} defaultValue={50} inputProps={{ min: 0, max: 100 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Resize Dimensions" inputRef={resizeDimsRef} placeholder="e.g., (640,480)" />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Crop Region" inputRef={cropRegionRef} placeholder="e.g., (0,0,640,480)" />
              </Grid>

              {/* ── Intrusion / LP toggle ── */}
              <Grid item xs={12}>
                <Box sx={{
                  border: "1px solid var(--border)", borderRadius: 2, p: 2,
                  backgroundColor: "var(--card-bg)",
                }}>
                  <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px 0" }}>
                    Camera Mode — choose ONE:
                  </p>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" ref={detectIntrusionsRef} defaultChecked={true} />
                    <span style={{ color: "var(--text)", fontSize: 14 }}>
                      Enable Intrusion Detection
                    </span>
                  </label>
                  <p style={{ color: "var(--muted)", fontSize: 11, margin: "6px 0 0 24px" }}>
                    ☑ checked = Intrusion mode &nbsp;|&nbsp; ☐ unchecked = Gate / License Plate mode
                  </p>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button variant="outlined" fullWidth onClick={() => { fetchFrameForDrawing(); setShowDrawingModal(true); }} sx={{ mb: 2 }}>
                  📍 Draw Intrusion Points (Optional)
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
              <Button variant="contained" fullWidth onClick={handleAddCamera} sx={{ backgroundColor: "var(--accent)" }}>Add Camera</Button>
              <Button variant="outlined" fullWidth onClick={() => { setShowAddModal(false); setDrawnPoints([]); }}>Cancel</Button>
            </Box>
          </Box>
        </Modal>

        {/* ── Edit Camera Modal ─────────────────────────────────────────────── */}
        <Modal open={showEditModal} onClose={() => setShowEditModal(false)}>
          <Box sx={modalStyle}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <h2>Edit Camera {currentCamera?.id}</h2>
              <IconButton onClick={() => { setShowEditModal(false); setDrawnPoints([]); }}>
                <CloseIcon />
              </IconButton>
            </Box>

            <Grid container spacing={2}>
              <Grid item xs={12}>
                <TextField fullWidth label="Camera URL (RTSP/HTTP)" inputRef={urlRef} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Location" inputRef={locationRef} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Detection Threshold (0-100)" type="number" inputRef={thresholdRef} inputProps={{ min: 0, max: 100 }} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Resize Dimensions" inputRef={resizeDimsRef} />
              </Grid>
              <Grid item xs={12} sm={6}>
                <TextField fullWidth label="Crop Region" inputRef={cropRegionRef} />
              </Grid>

              {/* ── Intrusion / LP toggle ── */}
              <Grid item xs={12}>
                <Box sx={{
                  border: "1px solid var(--border)", borderRadius: 2, p: 2,
                  backgroundColor: "var(--card-bg)",
                }}>
                  <p style={{ color: "var(--muted)", fontSize: 12, margin: "0 0 10px 0" }}>
                    Camera Mode — choose ONE:
                  </p>
                  <label style={{ display: "inline-flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                    <input type="checkbox" ref={detectIntrusionsRef} defaultChecked={true} />
                    <span style={{ color: "var(--text)", fontSize: 14 }}>
                      Enable Intrusion Detection
                    </span>
                  </label>
                  <p style={{ color: "var(--muted)", fontSize: 11, margin: "6px 0 0 24px" }}>
                    ☑ checked = Intrusion mode &nbsp;|&nbsp; ☐ unchecked = Gate / License Plate mode
                  </p>
                </Box>
              </Grid>

              <Grid item xs={12}>
                <Button variant="outlined" fullWidth onClick={() => { fetchFrameForDrawing(); setShowDrawingModal(true); }} sx={{ mb: 2 }}>
                  📍 Edit Intrusion Points
                </Button>
              </Grid>
            </Grid>

            <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
              <Button variant="contained" fullWidth onClick={handleUpdateCamera} sx={{ backgroundColor: "var(--accent)" }}>Update Camera</Button>
              <Button variant="outlined" fullWidth onClick={() => { setShowEditModal(false); setDrawnPoints([]); }}>Cancel</Button>
            </Box>
          </Box>
        </Modal>

        {/* ── Drawing Modal ─────────────────────────────────────────────────── */}
        <Modal open={showDrawingModal} onClose={() => setShowDrawingModal(false)}>
          <Box sx={{ ...modalStyle, maxWidth: 1000 }}>
            <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mb: 2 }}>
              <h2>Draw Intrusion Detection Points</h2>
              <IconButton onClick={() => setShowDrawingModal(false)}><CloseIcon /></IconButton>
            </Box>
            {frameLoading && <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>⏳ Loading camera frame...</Box>}
            {frameError && !frameLoading && (
              <Box sx={{ textAlign: "center", py: 3, px: 2, backgroundColor: "#fff3f3", border: "1px solid #f5c6cb", borderRadius: 1, color: "#721c24", mb: 2 }}>
                ⚠️ {frameError}
              </Box>
            )}
            {!frameLoading && videoFrame && (
              <PointDrawingCanvas
                videoUrl={videoFrame}
                onPointsChange={setDrawnPoints}
                initialPoints={currentCamera?.lines ? parsePointsFromString(currentCamera.lines) : ""}
              />
            )}
            <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
              <Button variant="contained" fullWidth onClick={() => setShowDrawingModal(false)} sx={{ backgroundColor: "var(--accent)" }}>Save Points</Button>
              <Button variant="outlined" fullWidth onClick={() => setShowDrawingModal(false)}>Close</Button>
            </Box>
          </Box>
        </Modal>

        {/* ── Delete Dialog ──────────────────────────────────────────────────── */}
        <Dialog open={showDeleteDialog} onClose={() => setShowDeleteDialog(false)}>
          <DialogTitle>Confirm Delete</DialogTitle>
          <DialogContent>
            Are you sure you want to delete camera <strong>{cameraToDelete?.id}</strong>? This action cannot be undone.
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
            <Button onClick={handleDeleteCamera} color="error" variant="contained">Delete</Button>
          </DialogActions>
        </Dialog>
      </div>
    </div>
  );
};

export default CameraManagement;