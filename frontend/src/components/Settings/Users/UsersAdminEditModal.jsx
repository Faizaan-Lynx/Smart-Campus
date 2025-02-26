import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Typography,
  Modal,
  TextField,
  IconButton,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  Checkbox,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
} from "@mui/material";
import CloseIcon from "@mui/icons-material/Close";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { localurl } from "../../../utils";

const style = {
  position: "absolute",
  top: "50%",
  left: "50%",
  transform: "translate(-50%, -50%)",
  width: "90%",
  maxWidth: 500,
  maxHeight: "90vh",
  bgcolor: "background.paper",
  borderRadius: 4,
  boxShadow: 24,
  p: 4,
  overflowY: "auto",
};

export default function UsersAdminEditModal({
  showEditSettingsModal,
  setShowEditSettingsModal,
  rowData,
}) {
  const [activeTab, setActiveTab] = useState("details");
  const [fieldValues, setFieldValues] = useState({
    username: rowData.username,
    email: rowData.email,
    password: "",
    ip_address: rowData.ip_address || "",
    is_admin: rowData.is_admin ? "Yes" : "No",
  });

  const [cameras, setCameras] = useState([]);
  const [selectedCameras, setSelectedCameras] = useState(rowData.assigned_cameras || []);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const token = localStorage.getItem("token");
        console.log("Fetching cameras...");
        const response = await axios.get("http://127.0.0.1:8000/camera/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        console.log("Camera API Response:", response.data);
        setCameras(response.data);
      } catch (error) {
        console.error("Error fetching cameras:", error);
      }
    };

    fetchCameras();
  }, []);

  const handleCameraSelect = (cameraId) => {
    setSelectedCameras((prevSelected) =>
      prevSelected.includes(cameraId)
        ? prevSelected.filter((id) => id !== cameraId)
        : [...prevSelected, cameraId]
    );
  };

  const handleUpdate = async () => {
    try {
      const token = localStorage.getItem("token");
  
      // Update User First
      await axios.put(
        `${localurl}/users/${rowData.id}`,
        {
          ...fieldValues,
          is_admin: fieldValues.is_admin === "Yes",
        },
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
  
      // Assign Selected Cameras (POST each selected camera)
      await Promise.all(
        selectedCameras.map(async (cameraId) => {
          try {
            await axios.post(
              "http://127.0.0.1:8000/user-cameras/",
              {
                user_id: rowData.id,
                camera_id: cameraId,
              },
              {
                headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
              }
            );
          } catch (error) {
            console.error(`Error assigning camera ${cameraId}:`, error);
          }
        })
      );
  
      toast.success("User Updated & Cameras Assigned!");
      setShowEditSettingsModal(false);
      window.location.reload();
    } catch (error) {
      toast.error("Error updating user");
    }
  };
  

  return (
    <Modal open={showEditSettingsModal} onClose={() => setShowEditSettingsModal(false)}>
      <Box sx={style}>
        <IconButton onClick={() => setShowEditSettingsModal(false)} sx={{ position: "absolute", top: 0, right: 0 }}>
          <CloseIcon />
        </IconButton>
        <Typography variant="h6">Edit User</Typography>

        <div style={{ display: "flex", marginBottom: "10px" }}>
          <Button onClick={() => setActiveTab("details")} variant={activeTab === "details" ? "contained" : "outlined"}>
            Details
          </Button>
          <Button onClick={() => setActiveTab("cameras")} variant={activeTab === "cameras" ? "contained" : "outlined"}>
            Assigned Cameras
          </Button>
        </div>

        {activeTab === "details" && (
          <>
            <TextField label="Username" fullWidth margin="normal" value={fieldValues.username} 
              onChange={(e) => setFieldValues({ ...fieldValues, username: e.target.value })} />
            <TextField label="Email" fullWidth margin="normal" value={fieldValues.email} 
              onChange={(e) => setFieldValues({ ...fieldValues, email: e.target.value })} />
            <TextField label="Password" fullWidth margin="normal" type="password" placeholder="Leave empty to keep unchanged" 
              onChange={(e) => setFieldValues({ ...fieldValues, password: e.target.value })} />
            <TextField label="IP Address" fullWidth margin="normal" value={fieldValues.ip_address} 
              onChange={(e) => setFieldValues({ ...fieldValues, ip_address: e.target.value })} />
            <FormControl fullWidth margin="normal">
              <InputLabel>Superuser</InputLabel>
              <Select value={fieldValues.is_admin} onChange={(e) => setFieldValues({ ...fieldValues, is_admin: e.target.value })}>
                <MenuItem value="Yes">Yes</MenuItem>
                <MenuItem value="No">No</MenuItem>
              </Select>
            </FormControl>
          </>
        )}

        {activeTab === "cameras" && (
          <List>
            {cameras.length > 0 ? (
              cameras.map((camera) => (
                <ListItem key={camera.id} button onClick={() => handleCameraSelect(camera.id)}>
                  <ListItemIcon>
                    <Checkbox checked={selectedCameras.includes(camera.id)} />
                  </ListItemIcon>
                  <ListItemText primary={`Camera ${camera.id}`} />
                </ListItem>
              ))
            ) : (
              <Typography>No cameras available</Typography>
            )}
          </List>
        )}

        <Button variant="contained" color="primary" fullWidth onClick={handleUpdate} sx={{ mt: 2 }}>
          Update
        </Button>
        <Toaster />
      </Box>
    </Modal>
  );
}
