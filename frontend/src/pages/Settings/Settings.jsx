import React, { useEffect, useState } from "react";
import "./Settings.css";
import UserAdmin from "../../components/Settings/Users/UsersAdmin";
import { localurl } from "../../utils";
import axios from "axios";
import UsersAdminSitesEditModal from "../../components/Settings/Users/UsersAdminSitesEditModal";

const Settings = () => {
  const [userInfo, setUserInfo] = useState([]);
  const [showEditSitesModal, setShowEditSitesModal] = useState(false);

  const userColumns = [
    { Header: "Ser No", accessor: "id" },
    { Header: "Name", accessor: "username" },
    { Header: "Email", accessor: "email" },
    { Header: "Assigned Cameras", accessor: "cameras" },
    // Removed Action column from here
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

      // Filter out the deleted user from the state
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
      <div className="users__table__div">
        <UserAdmin columns={userColumns} />
      </div>
    </div>
  );
};

export default Settings;
