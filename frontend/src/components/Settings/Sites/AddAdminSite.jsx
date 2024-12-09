import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { Grid, TextField } from "@mui/material";
import { useRef } from "react";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { localurl } from "../../../utils";
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

export default function AddAdminSiteModal({
  showAddAdminSiteModal,
  setShowAddAdminSiteModal,
}) {
  const handleClose = () => setShowAddAdminSiteModal(false);

  const field1Ref = useRef(null);
  const field2Ref = useRef(null);
  const field3Ref = useRef(null);
  const field4Ref = useRef(null);
  const field5Ref = useRef(null);
  const field6Ref = useRef(null);
  const field7Ref = useRef(null);
  const field8Ref = useRef(null);
  const field9Ref = useRef(null);
  const field10Ref = useRef(null);
  const field11Ref = useRef(null);
  const field12Ref = useRef(null);
  const field13Ref = useRef(null);
  const field14Ref = useRef(null);

  const [fieldValues, setFieldValues] = useState({
    field1: "",
    field2: "",
    field3: "",
    field4: "",
    field5: "",
    field6: "",
    field7: "",
    field8: "",
    field9: "",
    field10: "",
    field11: "",
    field12: "",
    field13: "",
    field14: "",
  });

  const handleUpdate = async () => {
    if (field1Ref.current.value === "") {
      toast.dismiss();
      toast.error("Site Name required");
      return;
    }

    const newValues = {
      name: field1Ref.current.value,
      location: field2Ref.current.value,
      contact: field3Ref.current.value,
      in_camera: field4Ref.current.value,
      out_camera: field5Ref.current.value,
      in_url: field6Ref.current.value,
      out_url: field7Ref.current.value,
      protocol: field8Ref.current.value
        ? parseInt(field8Ref.current.value, 10)
        : null,
      sensitivity: field9Ref.current.value
        ? parseInt(field9Ref.current.value, 10)
        : null,
      fps: field10Ref.current.value
        ? parseInt(field10Ref.current.value, 10)
        : null,
      threshold: field11Ref.current.value
        ? parseInt(field11Ref.current.value, 10)
        : null,
      rotation: field12Ref.current.value
        ? parseInt(field12Ref.current.value, 10)
        : null,
      reg_pts: field13Ref.current.value,
      crop_area: field14Ref.current.value,
    };

    try {
      const response = await axios.post(`${localurl}/sites/`, newValues, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      });
      toast.dismiss();
      toast.success("Site Added!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      console.error("Error adding site:", error);
      if (error.response && error.response.data && error.response.data.detail) {
        const errorMessage = error.response.data.detail;
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while adding the site.");
      }
    }
  };

  return (
    <div>
      <Modal
        open={showAddAdminSiteModal}
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
            Add Site Data
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={6}>
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
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field2Ref}
                label="Location"
                value={fieldValues.field2}
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field2: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field3Ref}
                value={fieldValues.field3}
                label="Contact"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field3: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field4Ref}
                value={fieldValues.field4}
                label="In Camera"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field4: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field5Ref}
                value={fieldValues.field5}
                label="Out Camera"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field5: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field6Ref}
                value={fieldValues.field6}
                label="In URL"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field6: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field7Ref}
                value={fieldValues.field7}
                label="Out URL"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field7: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                inputRef={field8Ref}
                value={fieldValues.field8}
                label="Protocol"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field8: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                inputRef={field9Ref}
                value={fieldValues.field9}
                label="Sensitivity"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field9: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                inputRef={field10Ref}
                value={fieldValues.field10}
                label="FPS"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field10: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                inputRef={field11Ref}
                value={fieldValues.field11}
                label="Threshold"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field11: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                type="number"
                inputRef={field12Ref}
                value={fieldValues.field12}
                label="Rotation"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field12: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field13Ref}
                value={fieldValues.field13}
                label="Reg Points"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field13: e.target.value })
                }
              />
            </Grid>
            <Grid item xs={6}>
              <TextField
                inputRef={field14Ref}
                value={fieldValues.field14}
                label="Crop Area"
                variant="outlined"
                margin="normal"
                fullWidth
                onChange={(e) =>
                  setFieldValues({ ...fieldValues, field14: e.target.value })
                }
              />
            </Grid>
          </Grid>
          <Button variant="contained" color="primary" onClick={handleUpdate}>
            Add
          </Button>
        </Box>
      </Modal>
      <Toaster />
    </div>
  );
}
