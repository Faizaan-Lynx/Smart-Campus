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

export default function AddHost({
  siteId,
  showAddHostModal,
  setShowAddHostModal,
}) {
  const handleClose = () => setShowAddHostModal(false);

  const [fieldValues, setFieldValues] = useState({
    field1: "",
    field2: "",
    field3: "",
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
        is_host: true,
        site_id: siteId,
      };
      // console.log(newValues)
      const response = await axios.post(
        `${localurl}/dashboard/sites/${siteId}/hosts`,
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
      toast.success("Host Added!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      console.error("Error Adding host:", error);

      if (error.response) {
        const { data, status } = error.response;
        if (data && data.detail) {
          toast.error(data.detail);
        } else {
          toast.error("Error Adding host. Please try again.");
        }
      } else if (error.request) {
        toast.error("No response received. Please try again later.");
      } else {
        toast.error("Request error. Please check your network connection.");
      }
    }
  };
  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const formData = new FormData();
    formData.append("image", file);

    try {
      const response = await axios.post(
        `${localurl}/dashboard/get_vector`,
        formData,
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
            "Content-Type": "multipart/form-data",
          },
        }
      );
      const vector = response.data[0].embedding;
      const vectorString = vector.join(","); // Join array elements into a string
      setFieldValues({ ...fieldValues, field2: vectorString });
      toast.success("Vector value retrieved successfully!");
    } catch (error) {
      console.error("Error retrieving vector value:", error);
      toast.error("Error retrieving vector value. Please try again.");
    }
  };

  const field1Ref = useRef(null);
  const field2Ref = useRef(null);

  return (
    <div>
      <Modal
        open={showAddHostModal}
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
            Add a new Host
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
          <input
            accept="image/png, image/jpeg"
            type="file"
            onChange={handleFileChange}
            style={{ marginTop: "16px", marginBottom: "16px" }}
          />
          <TextField
            disabled
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
