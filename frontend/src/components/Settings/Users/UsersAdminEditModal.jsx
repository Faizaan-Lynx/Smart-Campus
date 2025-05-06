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
  onUpdateCameras,
  onUpdateUser
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
  const [selectedCameras, setSelectedCameras] = useState(rowData.cameras || []);

  useEffect(() => {
    const fetchCameras = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://127.0.0.1:8000/camera/", {
          headers: { Authorization: `Bearer ${token}` },
        });
        const sortedCameras = response.data.sort((a, b) => a.id - b.id);
        setCameras(sortedCameras);
      } catch (error) {
        console.error("Error fetching cameras:", error);
      }
    };
    fetchCameras();
  }, []);

  const handleUpdateUser = async () => {
    try {
      const token = localStorage.getItem("token");
  
      // Create a request body excluding empty password
      const requestBody = {
        username: fieldValues.username,
        email: fieldValues.email,
        ip_address: fieldValues.ip_address,
        is_admin: fieldValues.is_admin === "Yes",
      };
  
      // Only include password if it's not empty
      if (fieldValues.password.trim()) {
        requestBody.hashed_password = fieldValues.password;
      }
  
      await axios.put(
        `${localurl}/users/${rowData.id}`,
        requestBody,
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
  
      toast.success("User details updated successfully!");
  
      // Update the user in the table immediately
      const updatedUser = { ...rowData, ...requestBody };
      onUpdateUser(updatedUser);
      setShowEditSettingsModal(false);
    } catch (error) {
      toast.error("Error updating user");
      console.error("Update user error:", error);
    }
  };
  
  

  const handleUpdateCameras = async () => {
    try {
      const token = localStorage.getItem("token");
  
      await axios.put(
        `http://127.0.0.1:8000/user-cameras/${rowData.id}`,
        { camera_ids: selectedCameras },
        {
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        }
      );
  
      toast.success("Cameras updated successfully!");
  
      // Update the user in the table immediately
      const updatedUser = { ...rowData, cameras: [...selectedCameras] };
      onUpdateCameras(updatedUser);  
      setShowEditSettingsModal(false);
    } catch (error) {
      toast.error("Error updating cameras");
      console.error(error);
    }
  };
  
  
  
  const handleCameraSelect = (cameraId) => {
    setSelectedCameras((prevSelected) =>
      prevSelected.includes(cameraId)
        ? prevSelected.filter((id) => id !== cameraId)
        : [...prevSelected, parseInt(cameraId, 10)]
    );
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
            {cameras.map((camera) => (
              <ListItem key={camera.id} button onClick={() => handleCameraSelect(camera.id)}>
                <ListItemIcon>
                  <Checkbox checked={selectedCameras.includes(camera.id)} />
                </ListItemIcon>
                <ListItemText primary={`Camera ${camera.id}`} />
              </ListItem>
            ))}
          </List>
        )}
  
        {/* Show Update User button only in Details tab */}
        {activeTab === "details" && (
          <Button variant="contained" color="primary" fullWidth onClick={handleUpdateUser} sx={{ mt: 2 }}>
            Update User
          </Button>
        )}
  
        {/* Show Update Cameras button only in Cameras tab */}
        {activeTab === "cameras" && (
          <Button variant="contained" color="primary" fullWidth onClick={handleUpdateCameras} sx={{ mt: 2 }}>
            Update Cameras
          </Button>
        )}
  
        <Toaster />
      </Box>
    </Modal>
  );
  
}
