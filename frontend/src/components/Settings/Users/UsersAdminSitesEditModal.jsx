import * as React from "react";
import Box from "@mui/material/Box";
import Button from "@mui/material/Button";
import Typography from "@mui/material/Typography";
import Modal from "@mui/material/Modal";
import toast, { Toaster } from "react-hot-toast";
import axios from "axios";
import { localurl } from "../../../utils";
import { useState } from "react";
import IconButton from "@mui/material/IconButton";
import CloseIcon from "@mui/icons-material/Close";
import { FormControl, InputLabel, MenuItem, Select } from "@mui/material";
import { useEffect } from "react";

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

export default function UsersAdminSitesEditModal({
  showEditSitesModal,
  setShowEditSitesModal,
  userId,
}) {
  const handleClose = () => setShowEditSitesModal(false);

  const [userSites, setUserSites] = useState([]);
  const [otherSites, setOtherSites] = useState([]);
  const [selectedDeleteSiteId, setSelectedDeleteSiteId] = useState("");
  const [selectedAddSiteId, setSelectedAddSiteId] = useState("");

  useEffect(() => {
    const fetchData = async () => {
      if (showEditSitesModal) {
        try {
          const response = await axios.get(
            `${localurl}/sites/?offset=0&limit=100`,
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem("token")}`,
              },
            }
          );

          const sites = response.data.filter((site) =>
            site.users.some((user) => user.id === userId)
          );

          setUserSites(sites);

          const otherSites = response.data.filter((site) =>
            site.users.every((user) => user.id !== userId)
          );

          setOtherSites(otherSites);
        } catch (error) {
          console.error("Error fetching user sites:", error);
        }
      }
    };

    fetchData();
  }, [showEditSitesModal, userId]);

  const handleDeleteSite = async () => {
    if (selectedDeleteSiteId == "") {
      toast.error("No Site selected");
      return;
    }
    try {
      // Get the bearer token from local storage
      const token = localStorage.getItem("token");
      // Send PATCH request
      await axios.patch(
        `${localurl}/users/${userId}/notsite/${selectedDeleteSiteId}`,
        {},
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.dismiss();
      toast.success("Site Deleted!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        const errorMessage = error.response.data.detail;
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while Deletings the user sites.");
      }
    }
  };

  const handleAddSite = async () => {
    if (selectedAddSiteId == "") {
      toast.error("No Site selected");
      return;
    }
    try {
      // Get the bearer token from local storage
      const token = localStorage.getItem("token");
      // Send PATCH request
      await axios.patch(
        `${localurl}/users/${userId}/site/${selectedAddSiteId}`,
        {},
        {
          headers: {
            Accept: "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );
      toast.dismiss();
      toast.success("Site Updated!");
      setTimeout(() => {
        handleClose();
      }, 3000);
      window.location.reload();
    } catch (error) {
      if (error.response && error.response.data && error.response.data.detail) {
        const errorMessage = error.response.data.detail;
        toast.error(errorMessage);
      } else {
        toast.error("An error occurred while updating the user sites.");
      }
    }
  };

  return (
    <div>
      <Modal
        open={showEditSitesModal}
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
          <Typography variant="h6" component="h2" mt={2} mb={2}>
            Current Sites: {userSites.length === 0 && <>None</>}
          </Typography>
          {userSites.length > 0 && (
            <ul>
              {userSites.map((site) => (
                <li key={site.id}>{`${site.id}: ${site.name}`}</li>
              ))}
            </ul>
          )}
          <Typography variant="subtitle1" mt={2} mb={1}>
            Add a Site
          </Typography>
          {otherSites.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No sites to add
            </Typography>
          ) : (
            <>
              <FormControl fullWidth variant="outlined" margin="normal">
                <InputLabel id="add-site-label">
                  Select a Site to Add
                </InputLabel>
                <Select
                  labelId="add-site-label"
                  id="add-site-select"
                  value={selectedAddSiteId}
                  onChange={(e) => setSelectedAddSiteId(e.target.value)}
                  label="Select a Site to Add"
                >
                  {otherSites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                onClick={handleAddSite}
              >
                Add
              </Button>
            </>
          )}

          {/* Delete a site */}
          <Typography variant="subtitle1" mt={2} mb={1}>
            Delete User Sites
          </Typography>
          {userSites.length === 0 ? (
            <Typography variant="body2" color="textSecondary">
              No user sites to delete
            </Typography>
          ) : (
            <>
              <FormControl fullWidth variant="outlined" margin="normal">
                <InputLabel id="delete-site-label">
                  Select a Site to Delete
                </InputLabel>
                <Select
                  labelId="delete-site-label"
                  id="delete-site-select"
                  value={selectedDeleteSiteId}
                  onChange={(e) => setSelectedDeleteSiteId(e.target.value)}
                  label="Select a Site to Delete"
                >
                  {userSites.map((site) => (
                    <MenuItem key={site.id} value={site.id}>
                      {site.name}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
              <Button
                variant="contained"
                color="primary"
                onClick={handleDeleteSite}
              >
                Delete
              </Button>
            </>
          )}

          {/* <Button variant="contained" color="primary" onClick={handleClose}>
            Close
          </Button> */}
        </Box>
      </Modal>
      <Toaster />
    </div>
  );
}
