import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import { TextField } from "@mui/material";
import { useState } from "react";
import toast, { Toaster } from "react-hot-toast";
import { useRef } from "react";
import { localurl } from "../../utils";
import axios from "axios";
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

export default function EditProfileModal({
  showEditProfileModal,
  setShowEditProfileModal,
  userData,
}) {
  const handleClose = () => setShowEditProfileModal(false);

  const field1Ref = useRef(null);
  const field2Ref = useRef(null);
  const field3Ref = useRef(null);
  const field4Ref = useRef(null);
  const [userFieldValues, setUserFieldValues] = useState({
    field1: userData.username,
    field2: userData.email,
    field3: userData.full_name,
    field4: "",
  });

  const handleUpdate = () => {
    // console.log(field2Ref.current.value, userData.email);
    if (
      field1Ref.current.value == (userData.username || "none") &&
      field2Ref.current.value == (userData.email || "none") &&
      field3Ref.current.value == (userData.full_name || "none") &&
      field4Ref.current.value == ""
    ) {
      toast.dismiss();
      toast.error("No updated value!");
      return;
    }

    if (field1Ref.current.value == "") {
      toast.dismiss();
      toast.error("Username cannot be empty");
      return;
    }
    if (field4Ref.current.value !== "" && field4Ref.current.value.length < 4) {
      toast.dismiss();
      toast.error("Password too short, Minimum 4 characters");
      return;
    }

    const newPassword = field4Ref.current.value;
    const newValues = {
      username: field1Ref.current.value,
      email: field2Ref.current.value,
      full_name: field3Ref.current.value,
      ...(newPassword.length > 3 && { password: newPassword }),
    };

    axios
      .patch(`${localurl}/dashboard/`, newValues, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          "Content-Type": "application/json",
          accept: "application/json",
        },
      })
      .then((response) => {
        // console.log("Update successful:", response.data);
        handleClose(); // Close the modal after successful update
        toast.dismiss();
        toast.success("User Updated!");
        setTimeout(() => {
          handleClose();
        }, 3000);
        window.location.reload(); // Timeout after 3 seconds
      })
      .catch((error) => {
        console.error("Error updating user:", error);
        toast.error("Error updating user!");
      });
  };

  return (
    <div>
      <Modal
        open={showEditProfileModal}
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
            Edit Profile
          </Typography>
          <TextField
            inputRef={field1Ref}
            label="Username"
            variant="outlined"
            margin="normal"
            fullWidth
            required
            value={userFieldValues.field1}
            onChange={(e) =>
              setUserFieldValues({ ...userFieldValues, field1: e.target.value })
            }
          />
          <TextField
            inputRef={field2Ref}
            label="Email"
            variant="outlined"
            margin="normal"
            fullWidth
            value={userFieldValues.field2}
            onChange={(e) =>
              setUserFieldValues({ ...userFieldValues, field2: e.target.value })
            }
          />
          <TextField
            inputRef={field3Ref}
            label="Full Name"
            variant="outlined"
            margin="normal"
            fullWidth
            value={userFieldValues.field3}
            onChange={(e) =>
              setUserFieldValues({ ...userFieldValues, field3: e.target.value })
            }
          />
          <TextField
            inputRef={field4Ref}
            label="Password"
            variant="outlined"
            margin="normal"
            fullWidth
            placeholder="Same if not changed"
            type="password"
            value={userFieldValues.field4}
            onChange={(e) =>
              setUserFieldValues({ ...userFieldValues, field4: e.target.value })
            }
          />

          <Button variant="contained" color="primary" onClick={handleUpdate}>
            Update
          </Button>
        </Box>
      </Modal>
      <Toaster />
    </div>
  );
}
