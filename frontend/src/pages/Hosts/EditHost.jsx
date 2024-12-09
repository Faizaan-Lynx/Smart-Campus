import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import {
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  TextField,
} from "@mui/material";
import { useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { localurl } from "../../utils";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";

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

export default function EditHost({
  showEditHostModal,
  setShowEditHostModal,
  rowData,
}) {
  const handleClose = () => setShowEditHostModal(false);

  const [fieldValues, setFieldValues] = useState({
    field1: rowData.name || "",
    field2: rowData.vector || "",
    field3:
      rowData.gender === "Female"
        ? "female"
        : rowData.gender === "Male"
        ? "male"
        : "",
  });

  const handleUpdate = async () => {
    try {
      if (fieldValues.field1 == "") {
        toast.error("Please enter Host name");
        return;
      }
      let isFemaleValue = null;
      if (fieldValues.field3 === "female") {
        isFemaleValue = true;
      } else if (fieldValues.field3 === "male") {
        isFemaleValue = false;
      }
      const newValues = {
        name: fieldValues.field1,
        vector: fieldValues.field2,
        is_female: isFemaleValue,
      };

      // Send PATCH request using axios
      const response = await axios.patch(
        `${localurl}/dashboard/sites/${rowData.siteId}/hosts/${rowData.hostId}`,
        newValues,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "application/json",
          },
        }
      );
      toast.dismiss();
      toast.success("Host Updated!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      console.error("Error updating host:", error);

      if (error.response) {
        const { data, status } = error.response;
        if (data && data.detail) {
          toast.error(data.detail);
        } else {
          toast.error("Error updating host. Please try again.");
        }
      } else if (error.request) {
        toast.error("No response received. Please try again later.");
      } else {
        toast.error("Request error. Please check your network connection.");
      }
    }
  };

  const field1Ref = useRef(null);
  const field2Ref = useRef(null);

  return (
    <div>
      <Modal
        open={showEditHostModal}
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
            Edit Host Data
          </Typography>
          <TextField
            inputRef={field1Ref}
            label="Name"
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
            label="Vector"
            value={fieldValues.field2}
            variant="outlined"
            margin="normal"
            fullWidth
            required
            onChange={(e) =>
              setFieldValues({ ...fieldValues, field2: e.target.value })
            }
          />
          <FormControl fullWidth variant="outlined" margin="normal" required>
            <InputLabel id="gender-label">Gender</InputLabel>
            <Select
              value={fieldValues.field3}
              labelId="gender-label"
              id="gender-select"
              onChange={(e) =>
                setFieldValues({
                  ...fieldValues,
                  field3: e.target.value,
                })
              }
              label="Gender"
            >
              <MenuItem value="male">Male</MenuItem>
              <MenuItem value="female">Female</MenuItem>
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
