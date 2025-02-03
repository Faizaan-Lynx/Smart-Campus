import React, { useEffect, useState } from "react";
import "./Settings.css";
import UserAdmin from "../../components/Settings/Users/UsersAdmin";
import { localurl } from "../../utils";
import axios from "axios";
import UsersAdminSitesEditModal from "../../components/Settings/Users/UsersAdminSitesEditModal";

const Settings = () => {
  const [userInfo, setUserInfo] = useState([]);
  const [showEditSitesModal, setShowEditSitesModal] = useState(false);

  // Dummy data
  const fetchDummyData = async () => {
    const dummyUserData = [
      {
        id: 1,
        username: "johndoe",
        email: "johndoe@example.com",
        full_name: "John Doe",
        assigned_camera: "Camera A",
      },
      {
        id: 2,
        username: "janedoe",
        email: "janedoe@example.com",
        full_name: "Jane Doe",
        assigned_camera: "Camera B",
      },
    ];

    setUserInfo(dummyUserData);
  };

  useEffect(() => {
    fetchDummyData();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${localurl}/users/?offset=0&limit=100`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setUserInfo(response.data);
      } catch (error) {
        console.error("Error fetching user data:", error);
      }
    };

    fetchData();
  }, []);

  const userColumns = [
    { Header: "Ser No", accessor: "serNo" },
    { Header: "Name", accessor: "name" },
    { Header: "Email", accessor: "email" },
    { Header: "Assigned Camera", accessor: "assignedCamera" },
    { Header: "Action", accessor: "action" },
  ];

  const userData = userInfo.map((user, index) => ({
    serNo: index + 1,
    name: user.full_name,
    email: user.email,
    assignedCamera: user.assigned_camera,
    action: (
      <div className="action_column_div">
        <button
          onClick={() => {
            setShowEditSitesModal(!showEditSitesModal);
            setId(user.id);
          }}
          style={{ cursor: "pointer", marginRight: "10px" }}
        >
          Edit
        </button>
        <button
          onClick={() => handleDelete(user.id)}
          style={{ cursor: "pointer" }}
        >
          Delete
        </button>
      </div>
    ),
  }));

  const [id, setId] = useState(null);

  const handleDelete = (userId) => {
    // Implement delete logic here
    console.log("Delete user with ID:", userId);
  };

  return (
    <div className="settings_div">
      {showEditSitesModal && (
        <UsersAdminSitesEditModal
          showEditSitesModal={showEditSitesModal}
          setShowEditSitesModal={setShowEditSitesModal}
          userId={id}
        />
      )}
      <div className="users__table__div">
        <UserAdmin columns={userColumns} data={userData} />
      </div>
    </div>
  );
};

export default Settings;
