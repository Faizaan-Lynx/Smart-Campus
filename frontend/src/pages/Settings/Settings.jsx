import React, { useEffect, useState } from "react";
import "./Settings.css";
import UserAdmin from "../../components/Settings/Users/UsersAdmin";
import SitesAdmin from "../../components/Settings/Sites/SitesAdmin";
import { localurl } from "../../utils";
import axios from "axios";
import UsersAdminSitesEditModal from "../../components/Settings/Users/UsersAdminSitesEditModal";

const Settings = () => {
  const [userInfo, setUserInfo] = useState([]);
  const [siteInfo, setSiteInfo] = useState([]);
  const [showEditSitesModal, setShowEditSitesModal] = useState(false);

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

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await axios.get(
          `${localurl}/sites/?offset=0&limit=100`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        setSiteInfo(response.data);
      } catch (error) {
        console.error("Error fetching site data:", error);
      }
    };

    fetchData();
  }, []);

  const userColumns = [
    { Header: "ID", accessor: "id" },
    { Header: "Username", accessor: "username" },
    { Header: "Email", accessor: "email" },
    { Header: "Full Name", accessor: "fullName" },
    { Header: "Status", accessor: "status" },
    { Header: "Superuser", accessor: "superuser" },
    { Header: "Sites", accessor: "sites" },
    { Header: "Created", accessor: "created" },
  ];

  const userData = userInfo.map((user) => ({
    id: user.id,
    username: user.username,
    email: user.email,
    fullName: user.full_name,
    status: user.disabled ? "Disabled" : "Active",
    superuser: user.is_su ? "Yes" : "No",
    sites: (
      <div className="sites_column_div">
        <p
          onClick={() => {
            setShowEditSitesModal(!showEditSitesModal);
            setId(user.id);
          }}
          style={{ cursor: "pointer", fontSize: "20px" }}
        >
          <i class="bx bx-edit-alt"></i>
        </p>
      </div>
    ),
    created: user.created_at,
  }));

  const [id, setId] = useState(null);
  const siteColumns = [
    { Header: "Name", accessor: "name" },
    { Header: "Location", accessor: "location" },
    { Header: "Contact", accessor: "contact" },
    { Header: "In Camera", accessor: "inCamera" },
    { Header: "Out Camera", accessor: "outCamera" },
    { Header: "In url", accessor: "in_url_trunc" },
    { Header: "Out url", accessor: "out_url_trunc" },
    { Header: "Users", accessor: "users" },
    { Header: "Guests", accessor: "hosts" },
  ];

  const createHref = (url) => {
    if (!url) {
      return;
    }
    if (url?.length <= 7) {
      return url;
    }
    const truncatedUrl = url?.substring(0, 15);
    return <>{truncatedUrl}...</>;
  };

  const siteData = siteInfo.map((site) => ({
    name: site.name,
    location: site.location,
    contact: site.contact, // Use "N/A" if contact is null
    inCamera: site.in_camera, // Use "N/A" if in_camera is null
    outCamera: site.out_camera, // Use "N/A" if out_camera is null
    siteId: site.id,
    in_url: site.in_url,
    out_url: site.out_url,
    in_url_trunc: createHref(site.in_url),
    out_url_trunc: createHref(site.out_url),
    protocol: site.protocol,
    sensitivity: site.sensitivity,
    fps: site.fps,
    threshold: site.threshold,
    rotation: site.rotation,
    reg_pts: site.reg_pts,
    crop_area: site.crop_area,
    users: site.users ? site.users.length : 0,
    hosts: site.hosts ? site.hosts.length : 0,
    guests: site.visits
      ? site.visits.filter((visit) => visit.is_new).length
      : 0,
  }));

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
      <div className="sites__table__div">
        <SitesAdmin columns={siteColumns} data={siteData} />
      </div>
    </div>
  );
};

export default Settings;
