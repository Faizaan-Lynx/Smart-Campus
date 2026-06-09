import React, { useState, useEffect, useRef } from "react";
import "./CameraManagement.css";
import axios from "axios";
import { localurl } from "../../utils";
import BACKEND_URL from "../../config.js";
import { toast, ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import {
  Box,
  Modal,
  TextField,
  Button,
  Grid,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from "@mui/material";
import DeleteIcon from "@mui/icons-material/Delete";
import EditIcon from "@mui/icons-material/Edit";
import CloseIcon from "@mui/icons-material/Close";
import PointDrawingCanvas from "../../components/PointDrawingCanvas/PointDrawingCanvas";

const CameraManagement = () => {
  // State Management
  const [cameras, setCameras] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDrawingModal, setShowDrawingModal] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [cameraToDelete, setCameraToDelete] = useState(null);
  const [currentCamera, setCurrentCamera] = useState(null);
  const [drawnPoints, setDrawnPoints] = useState([]);

  // Form References
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

  // Fetch frame when Drawing modal opens — works for both Add and Edit flows.
  // For Add modal, urlRef holds the user-typed URL; we POST a quick /frame
  // preview request. For Edit modal, we use the existing camera id.
  const fetchFrameForDrawing = async () => {
    setVideoFrame(null);
    setFrameError(null);
    setFrameLoading(true);

    try {
      let url;
      if (currentCamera?.id) {
        // Edit flow — camera already saved, use its id
        url = `${localurl}/camera/${currentCamera.id}/frame`;
      } else {
        // Add flow — camera not saved yet; try a dedicated preview endpoint
        // that accepts the raw URL in the query string
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

      // Revoke any previous blob to avoid memory leaks
      setVideoFrame((prev) => {
        if (prev) URL.revokeObjectURL(prev);
        return URL.createObjectURL(response.data);
      });
    } catch (err) {
      console.error("Failed to fetch camera frame:", err);
      setFrameError("Could not load camera frame. Check the camera URL and make sure the stream is reachable.");
    } finally {
      setFrameLoading(false);
    }
  };

  // Fetch all cameras
  const fetchCameras = async () => {
    try {
      setLoading(true);
      const response = await axios.get(`${localurl}/camera/`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
      setCameras(response.data);
    } catch (error) {
      toast.error("Failed to fetch cameras");
      console.error("Error fetching cameras:", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCameras();
  }, []);

  // Handle Add Camera
  const handleAddCamera = async () => {
    if (!urlRef.current?.value) {
      toast.error("Camera URL is required");
      return;
    }

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
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Camera added successfully");
      setShowAddModal(false);
      setDrawnPoints([]);
      clearForm();
      fetchCameras();
    } catch (error) {
      toast.error("Failed to add camera");
      console.error("Error adding camera:", error);
    }
  };

  // Handle Update Camera
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
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Camera updated successfully");
      setShowEditModal(false);
      setDrawnPoints([]);
      fetchCameras();
    } catch (error) {
      toast.error("Failed to update camera");
      console.error("Error updating camera:", error);
    }
  };

  // Handle Delete Camera
  const handleDeleteCamera = async () => {
    if (!cameraToDelete) return;

    try {
      await axios.delete(`${localurl}/camera/${cameraToDelete.id}`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      toast.success("Camera deleted successfully");
      setShowDeleteDialog(false);
      setCameraToDelete(null);
      fetchCameras();
    } catch (error) {
      toast.error("Failed to delete camera");
      console.error("Error deleting camera:", error);
    }
  };

  // Open Edit Modal
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

  // Open Add Modal
  const openAddModal = () => {
    setCurrentCamera(null);
    setDrawnPoints([]);
    clearForm();
    setShowAddModal(true);
  };

  // Clear form
  const clearForm = () => {
    if (urlRef.current) urlRef.current.value = "";
    if (locationRef.current) locationRef.current.value = "";
    if (thresholdRef.current) thresholdRef.current.value = 50;
    if (resizeDimsRef.current) resizeDimsRef.current.value = "";
    if (cropRegionRef.current) cropRegionRef.current.value = "";
    if (detectIntrusionsRef.current) detectIntrusionsRef.current.checked = true;
  };

  // Format points to string
  const formatPointsToString = (polygons) => {
    // Backend expects: [[(x1,y1),(x2,y2),...],[(x1,y1),...]]
    // Outer array = [[ ]], each polygon is a flat list of (x,y) tuples
    if (!polygons || polygons.length === 0) return "";
    const inner = polygons.map(
      (polygon) => polygon.map((p) => `(${p[0]},${p[1]})`).join(",")
    );
    return `[${inner.map((p) => `[${p}]`).join(",")}]`;
  };

  // Parse points from string
  const parsePointsFromString = (pointsStr) => {
    if (!pointsStr) return "";
    try {
      const cleaned = pointsStr.replace(/\(/g, "[").replace(/\)/g, "]");
      const parsed = JSON.parse(cleaned);
      return pointsStr;
    } catch {
      return pointsStr;
    }
  };

  // Get video frame URL (attempt to fetch first frame from stream)
  const getVideoFrameUrl = (camera) => {
    if (!camera || !camera.id) return "";
    return `${localurl}/camera/${camera.id}/frame`;
  };

  const modalStyle = {
    position: "absolute",
    top: "50%",
    left: "50%",
    transform: "translate(-50%, -50%)",
    width: "90%",
    maxWidth: 800,
    maxHeight: "90vh",
    bgcolor: "background.paper",
    borderRadius: 1,
    boxShadow: 24,
    p: 4,
    overflowY: "auto",
  };

  if (loading) {
    return (
      <div className="camera-management-container">
        <p>Loading cameras...</p>
      </div>
    );
  }

  return (
    <div className="camera-management-container">
      <ToastContainer position="top-right" autoClose={3000} />

      <div className="camera-header">
        <h1>Cam Control</h1>
        <button className="btn-primary" onClick={openAddModal}>
          + Add Camera
        </button>
      </div>

      {cameras.length === 0 ? (
        <div className="no-cameras">
          <p>No cameras configured yet. Click "Add Camera" to get started.</p>
        </div>
      ) : (
        <TableContainer component={Paper} className="cameras-table">
          <Table>
            <TableHead>
              <TableRow style={{ backgroundColor: "#1f2a40" ,color:"white"}}>
                <TableCell style={{color:"white",fontSize:'13px'}}><strong>ID</strong></TableCell>
                <TableCell style={{color:"white"}}><strong>URL</strong></TableCell>
                <TableCell style={{color:"white"}}><strong>Location</strong></TableCell>
                <TableCell style={{color:"white"}}><strong>Threshold</strong></TableCell>
                <TableCell style={{color:"white"}}><strong>Intrusion Detection</strong></TableCell>
                <TableCell style={{color:"white"}} align="center"><strong>Actions</strong></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {cameras.map((camera) => (
                <TableRow key={camera.id} hover style={{backgroundColor:"#1f2a40"}}>
                  <TableCell style={{color:"whitesmoke"}}>{camera.id}</TableCell>
                  <TableCell style={{color:"whitesmoke"}} className="url-cell">{camera.url}</TableCell>
                  <TableCell style={{color:"whitesmoke"}}>{camera.location || "-"}</TableCell>
                  <TableCell style={{color:"whitesmoke"}}>{camera.detection_threshold}</TableCell>
                  <TableCell style={{color:"whitesmoke"}}>
                    {camera.detect_intrusions ? "✓ Yes" : "✗ No"}
                  </TableCell>
                  <TableCell align="center">
                    <IconButton
                      size="small"
                      color="primary"
                      onClick={() => openEditModal(camera)}
                      title="Edit Camera"
                    >
                      <EditIcon />
                    </IconButton>
                    <IconButton
                      size="small"
                      color="error"
                      onClick={() => {
                        setCameraToDelete(camera);
                        setShowDeleteDialog(true);
                      }}
                      title="Delete Camera"
                    >
                      <DeleteIcon />
                    </IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      )}

      {/* Add Camera Modal */}
      <Modal
        open={showAddModal}
        onClose={() => setShowAddModal(false)}
        aria-labelledby="add-camera-modal"
      >
        <Box sx={modalStyle}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <h2>Add New Camera</h2>
            <IconButton
              onClick={() => {
                setShowAddModal(false);
                setDrawnPoints([]);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Camera URL (RTSP/HTTP)"
                inputRef={urlRef}
                placeholder="rtsp://user:pass@192.168.1.1:554"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                inputRef={locationRef}
                placeholder="e.g., Main Gate"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Detection Threshold (0-100)"
                type="number"
                inputRef={thresholdRef}
                defaultValue={50}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Resize Dimensions"
                inputRef={resizeDimsRef}
                placeholder="e.g., (640,480)"
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Crop Region"
                inputRef={cropRegionRef}
                placeholder="e.g., (0,0,640,480)"
              />
            </Grid>

            <Grid item xs={12}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  ref={detectIntrusionsRef}
                  defaultChecked={true}
                />
                <span>Enable Intrusion Detection</span>
              </label>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  fetchFrameForDrawing();
                  setShowDrawingModal(true);
                }}
                sx={{ mb: 2 }}
              >
                📍 Draw Intrusion Points (Optional)
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleAddCamera}
              sx={{ backgroundColor: "#4caf50" }}
            >
              Add Camera
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setShowAddModal(false);
                setDrawnPoints([]);
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Edit Camera Modal */}
      <Modal
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        aria-labelledby="edit-camera-modal"
      >
        <Box sx={modalStyle}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <h2>Edit Camera {currentCamera?.id}</h2>
            <IconButton
              onClick={() => {
                setShowEditModal(false);
                setDrawnPoints([]);
              }}
            >
              <CloseIcon />
            </IconButton>
          </Box>

          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                fullWidth
                label="Camera URL (RTSP/HTTP)"
                inputRef={urlRef}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Location"
                inputRef={locationRef}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Detection Threshold (0-100)"
                type="number"
                inputRef={thresholdRef}
                inputProps={{ min: 0, max: 100 }}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Resize Dimensions"
                inputRef={resizeDimsRef}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <TextField
                fullWidth
                label="Crop Region"
                inputRef={cropRegionRef}
              />
            </Grid>

            <Grid item xs={12}>
              <label style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                <input
                  type="checkbox"
                  ref={detectIntrusionsRef}
                />
                <span>Enable Intrusion Detection</span>
              </label>
            </Grid>

            <Grid item xs={12}>
              <Button
                variant="outlined"
                fullWidth
                onClick={() => {
                  fetchFrameForDrawing();
                  setShowDrawingModal(true);
                }}
                sx={{ mb: 2 }}
              >
                📍 Edit Intrusion Points
              </Button>
            </Grid>
          </Grid>

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={handleUpdateCamera}
              sx={{ backgroundColor: "#2196f3" }}
            >
              Update Camera
            </Button>
            <Button
              variant="outlined"
              fullWidth
              onClick={() => {
                setShowEditModal(false);
                setDrawnPoints([]);
              }}
            >
              Cancel
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Drawing Modal */}
      <Modal
        open={showDrawingModal}
        onClose={() => setShowDrawingModal(false)}
        aria-labelledby="drawing-modal"
      >
        <Box sx={{ ...modalStyle, maxWidth: 1000 }}>
          <Box
            sx={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              mb: 2,
            }}
          >
            <h2>Draw Intrusion Detection Points</h2>
            <IconButton onClick={() => setShowDrawingModal(false)}>
              <CloseIcon />
            </IconButton>
          </Box>

          {frameLoading && (
            <Box sx={{ textAlign: "center", py: 4, color: "text.secondary" }}>
              ⏳ Loading camera frame...
            </Box>
          )}

          {frameError && !frameLoading && (
            <Box
              sx={{
                textAlign: "center",
                py: 3,
                px: 2,
                backgroundColor: "#fff3f3",
                border: "1px solid #f5c6cb",
                borderRadius: 1,
                color: "#721c24",
                mb: 2,
              }}
            >
              ⚠️ {frameError}
            </Box>
          )}

          {!frameLoading && videoFrame && (
            <PointDrawingCanvas
              videoUrl={videoFrame}
              onPointsChange={setDrawnPoints}
              initialPoints={
                currentCamera?.lines ? parsePointsFromString(currentCamera.lines) : ""
              }
            />
          )}

          <Box sx={{ display: "flex", gap: 2, mt: 3 }}>
            <Button
              variant="contained"
              fullWidth
              onClick={() => setShowDrawingModal(false)}
              sx={{ backgroundColor: "#4caf50" }}
            >
              Save Points
            </Button>
            <Button variant="outlined" fullWidth onClick={() => setShowDrawingModal(false)}>
              Close
            </Button>
          </Box>
        </Box>
      </Modal>

      {/* Delete Confirmation Dialog */}
      <Dialog
        open={showDeleteDialog}
        onClose={() => setShowDeleteDialog(false)}
      >
        <DialogTitle>Confirm Delete</DialogTitle>
        <DialogContent>
          Are you sure you want to delete camera{" "}
          <strong>{cameraToDelete?.id}</strong>? This action cannot be undone.
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setShowDeleteDialog(false)}>Cancel</Button>
          <Button
            onClick={handleDeleteCamera}
            color="error"
            variant="contained"
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
};

export default CameraManagement;