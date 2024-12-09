import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { TextField } from "@mui/material";
import { useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { localurl } from "../../../utils";
import { useState } from "react";
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
  // console.log(rowData);
  const [fieldValues, setFieldValues] = useState({
    field1: rowData.username,
    field2: rowData.email,
    field3: rowData.fullName,
    field4: "",
    field5: rowData.status === "Active" ? "Active" : "Disabled",
    field6: rowData.superuser === "Yes" ? "Yes" : "No",
  });

  const handleUpdate = async () => {
    if (
      field4Ref.current.value.length !== 0 &&
      field4Ref.current.value.length < 4
    ) {
      toast.dismiss();
      toast.error("Password too short");
      return;
    }
    // // Get values from refs
    const newPassword = field4Ref.current.value;
    const newValues = {
      username: fieldValues.field1,
      email: fieldValues.field2 || null,
      full_name: fieldValues.field3 || null,
      ...(newPassword.length > 3 && { password: newPassword }),
      disabled: fieldValues.field5 === "Active" ? false : true,
      is_su: fieldValues.field6 === "Yes" ? true : false,
    };
    // console.log(newValues);
    try {
      const response = await axios.patch(
        `${localurl}/users/${rowData.id}`,
        newValues,
        {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.dismiss();

      toast.success("User Updated!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        const errorMessage = error.response.data.detail;
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating the user.");
      }
    }
  };

  const field1Ref = useRef(null);
  const field2Ref = useRef(null);
  const field3Ref = useRef(null);
  const field4Ref = useRef(null);

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
            inputRef={field3Ref}
            value={fieldValues.field3}
            label="Full Name"
            variant="outlined"
            margin="normal"
            fullWidth
            required
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field3: e.target.value })
            }
          />
          <TextField
            inputRef={field4Ref}
            value={fieldValues.field4}
            label="Password"
            variant="outlined"
            placeholder="Unchanged if empty"
            margin="normal"
            fullWidth
            type="password"
            required
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field4: e.target.value })
            }
          />
          <FormControl fullWidth variant="outlined" margin="normal" required>
            <InputLabel id="gender-label">Account Status</InputLabel>
            <Select
              value={fieldValues.field5}
              labelId="gender-label"
              id="gender-select"
              onChange={(e) =>
                setFieldValues({
                  ...fieldValues,
                  field5: e.target.value,
                })
              }
              label="Disabled"
            >
              <MenuItem value="Active">Active</MenuItem>
              <MenuItem value="Disabled">Disabled</MenuItem>
            </Select>
          </FormControl>
          <FormControl fullWidth variant="outlined" margin="normal" required>
            <InputLabel id="gender-label">Superuser</InputLabel>
            <Select
              value={fieldValues.field6}
              labelId="gender-label"
              id="gender-select"
              onChange={(e) =>
                setFieldValues({
                  ...fieldValues,
                  field6: e.target.value,
                })
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
          {/* <Button variant="contained" color="primary" onClick={handleClose}>
            Close
          </Button> */}
        </Box>
      </Modal>
      <Toaster />
    </div>
  );
}
