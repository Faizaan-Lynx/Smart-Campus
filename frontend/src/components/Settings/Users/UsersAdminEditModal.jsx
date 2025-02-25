import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { TextField } from "@mui/material";
import { useRef, useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { localurl } from "../../../utils";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";

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
  const handleClose = () => setShowEditSettingsModal(false);

  // Initialize only the fields required by the new API
  const [fieldValues, setFieldValues] = useState({
    field1: rowData.username,
    field2: rowData.email,
    field4: "", // password (hashed_password)
    field7: rowData.ip_address || "",
    field6: rowData.is_admin ? "Yes" : "No", // Superuser maps to is_admin
  });

  const handleUpdate = async () => {
    const newPassword = field4Ref.current.value;
    if (newPassword.length !== 0 && newPassword.length < 4) {
      toast.dismiss();
      toast.error("Password too short");
      return;
    }
    // Build the request body according to the API spec
    const newValues = {
      username: fieldValues.field1,
      email: fieldValues.field2,
      hashed_password: newPassword, // if empty, your backend may ignore or require a non-empty value
      is_admin: fieldValues.field6 === "Yes",
      ip_address: fieldValues.field7,
    };

    try {
      const token = localStorage.getItem("token");
      await axios.put(`${localurl}/users/${rowData.id}`, newValues, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
      toast.dismiss();
      toast.success("User Updated!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      if (
        error.response &&
        error.response.data &&
        error.response.data.detail
      ) {
        toast.error(error.response.data.detail);
      } else {
        toast.error("An error occurred while updating the user.");
      }
    }
  };

  // Refs for form fields
  const field1Ref = useRef(null);
  const field2Ref = useRef(null);
  const field4Ref = useRef(null);
  const field7Ref = useRef(null);

  return (
    <div>
      <Modal
        open={showEditSettingsModal}
        onClose={handleClose}
        aria-labelledby="modal-modal-title"
        aria-describedby="modal-modal-description"
      >
        <Box sx={style}>
          <IconButton
            aria-label="close"
            onClick={handleClose}
            sx={{
              position: "absolute",
              top: 0,
              right: 0,
            }}
          >
            <CloseIcon />
          </IconButton>
          <Typography id="modal-modal-title" variant="h6" component="h2">
            Edit User Data
          </Typography>
          <TextField
            inputRef={field1Ref}
            label="Username"
            variant="outlined"
            value={fieldValues.field1}
            margin="normal"
            fullWidth
            required
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field1: e.target.value })
            }
          />
          <TextField
            inputRef={field2Ref}
            label="Email"
            value={fieldValues.field2}
            variant="outlined"
            margin="normal"
            fullWidth
            required
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field2: e.target.value })
            }
          />
          <TextField
            inputRef={field4Ref}
            label="Password"
            variant="outlined"
            placeholder="Unchanged if empty"
            margin="normal"
            fullWidth
            type="password"
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field4: e.target.value })
            }
          />
          <TextField
            inputRef={field7Ref}
            label="IP Address"
            variant="outlined"
            margin="normal"
            fullWidth
            required
            value={fieldValues.field7}
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field7: e.target.value })
            }
          />
          <FormControl fullWidth variant="outlined" margin="normal" required>
            <InputLabel id="superuser-label">Superuser</InputLabel>
            <Select
              value={fieldValues.field6}
              labelId="superuser-label"
              id="superuser-select"
              onChange={(e) =>
                setFieldValues({ ...fieldValues, field6: e.target.value })
              }
              label="Superuser"
            >
              <MenuItem value="Yes">Yes</MenuItem>
              <MenuItem value="No">No</MenuItem>
            </Select>
          </FormControl>
          <Button variant="contained" color="primary" onClick={handleUpdate}>
            Update
          </Button>
        </Box>
      </Modal>
      <Toaster />
    </div>
  );
}
