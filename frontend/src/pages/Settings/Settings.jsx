import React, { useEffect, useState } from "react";
import "./Settings.css";
import UserAdmin from "../../components/Settings/Users/UsersAdmin";
import { localurl } from "../../utils";
import axios from "axios";
import UsersAdminSitesEditModal from "../../components/Settings/Users/UsersAdminSitesEditModal";
import UserFeeds from "../../components/CameraFeedsButtons/CameraFeedsButtons";
import CameraFeedsButtons from "../../components/CameraFeedsButtons/CameraFeedsButtons";

const Settings = () => {
  const [userInfo, setUserInfo] = useState([]);
  const [showEditSitesModal, setShowEditSitesModal] = useState(false);

  const userColumns = [
    { Header: "Ser No", accessor: "id" },
    { Header: "Name", accessor: "username" },
    { Header: "Email", accessor: "email" },
    { Header: "Assigned Cameras", accessor: "cameras" },
  ];

  const handleDelete = async (userId) => {
    console.log(`Deleting user with ID ${userId}...`);
    try {
      const token = localStorage.getItem("token");

      await axios.delete(`${localurl}/users/${userId}`, {
        headers: {
          accept: "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      setUserInfo((prevUsers) =>
        prevUsers.filter((user) => user.id !== userId)
      );

      console.log(`User with ID ${userId} deleted successfully.`);
    } catch (error) {
      console.error("Error deleting user:", error);
    }
  };

  return (
    <div className="settings_div">
      <div style={{ 
        padding: "24px",
        background: "linear-gradient(135deg, rgba(99, 102, 241, 0.1) 0%, rgba(167, 139, 250, 0.05) 100%)",
        borderRadius: "12px",
        border: "1px solid var(--border)",
        marginBottom: "10px"
      }}>
        <h1 style={{ 
          margin: "0 0 8px 0", 
          fontSize: "32px", 
          fontWeight: "700",
          background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
          WebkitBackgroundClip: "text",
          WebkitTextFillColor: "transparent",
          backgroundClip: "text",
        }}>
          ⚙️ Admin Control Panel
        </h1>
        <p style={{ margin: "0", color: "var(--muted)", fontSize: "14px" }}>
          Manage users, cameras, and system settings
        </p>
      </div>
      
      <div className="users__table__div">
        <UserAdmin columns={userColumns} />
      </div>


      <CameraFeedsButtons/>
    </div>
  );
};

export default Settings;
