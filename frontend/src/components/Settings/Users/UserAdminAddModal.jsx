import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { TextField, FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
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

export default function UserAdminAddModal({ showAddUserModal, setShowAddUserModal }) {
  const handleClose = () => setShowAddUserModal(false);

  const [fieldValues, setFieldValues] = useState({
    username: "",
    email: "",
    hashed_password: "",
    is_admin: "No",
    ip_address: "",
  });

  const handleAddUser = async () => {
    if (fieldValues.hashed_password.length < 4) {
      toast.error("Password too short");
      return;
    }

    const newUser = {
      username: fieldValues.username,
      email: fieldValues.email,
      hashed_password: fieldValues.hashed_password,
      is_admin: fieldValues.is_admin === "Yes",
      ip_address: fieldValues.ip_address,
    };

    try {
      const token = localStorage.getItem("token");
      await axios.post(`${localurl}/users/`, newUser, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      toast.success("User Added Successfully!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("An error occurred while adding the user.");
      }
    }
  };

  return (
    <div>
      <Modal open={showAddUserModal} onClose={handleClose}>
        <Box sx={style}>
          <IconButton onClick={handleClose} sx={{ position: "absolute", top: 0, right: 0 }}>
            <CloseIcon />
          </IconButton>
          <Typography variant="h6">Add New User</Typography>
          <TextField
            label="Username"
            variant="outlined"
            fullWidth
            margin="normal"
            value={fieldValues.username}
            onChange={(e) => setFieldValues({ ...fieldValues, username: e.target.value })}
          />
          <TextField
            label="Email"
            variant="outlined"
            fullWidth
            margin="normal"
            value={fieldValues.email}
            onChange={(e) => setFieldValues({ ...fieldValues, email: e.target.value })}
          />
          <TextField
            label="Password"
            type="password"
            variant="outlined"
            fullWidth
            margin="normal"
            value={fieldValues.hashed_password}
            onChange={(e) => setFieldValues({ ...fieldValues, hashed_password: e.target.value })}
          />
          <TextField
            label="IP Address"
            variant="outlined"
            fullWidth
            margin="normal"
            value={fieldValues.ip_address}
            onChange={(e) => setFieldValues({ ...fieldValues, ip_address: e.target.value })}
          />
          <FormControl fullWidth variant="outlined" margin="normal">
            <InputLabel id="superuser-label">Superuser</InputLabel>
            <Select
              value={fieldValues.is_admin}
              labelId="superuser-label"
              onChange={(e) => setFieldValues({ ...fieldValues, is_admin: e.target.value })}
              label="Superuser"
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" color="primary" onClick={handleAddUser}>
            Add User
          </Button>
        </Box>
      </Modal>
      <Toaster />
    </div>
  );
}
