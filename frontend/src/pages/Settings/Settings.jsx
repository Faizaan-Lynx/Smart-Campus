import React, { useEffect, useState } from "react";
import "./Settings.css";
import UserAdmin from "../../components/Settings/Users/UsersAdmin";
import SitesAdmin from "../../components/Settings/Sites/SitesAdmin";
import UsersAdminSitesEditModal from "../../components/Settings/Users/UsersAdminSitesEditModal";

const Settings = () => {
  // Dummy Data for Users and Sites
  const [userInfo, setUserInfo] = useState([
    {
      id: 1,
      username: "johndoe",
      email: "john@example.com",
      full_name: "John Doe",
      disabled: false,
      is_su: true,
      created_at: "2023-01-01T12:00:00Z",
    },
    {
      id: 2,
      username: "janedoe",
      email: "jane@example.com",
      full_name: "Jane Doe",
      disabled: true,
      is_su: false,
      created_at: "2022-07-23T14:15:30Z",
    },
  ]);

  const [siteInfo, setSiteInfo] = useState([
    {
      id: 1,
      name: "Site 1",
      location: "New York",
      contact: "123-456-7890",
      in_camera: true,
      out_camera: true,
      in_url: "http://site1.com/in",
      out_url: "http://site1.com/out",
      users: [1, 2],
      hosts: [1],
      visits: [{ is_new: true }, { is_new: false }],
    },
    {
      id: 2,
      name: "Site 2",
      location: "San Francisco",
      contact: "987-654-3210",
      in_camera: false,
      out_camera: true,
      in_url: "http://site2.com/in",
      out_url: "http://site2.com/out",
      users: [2],
      hosts: [2],
      visits: [{ is_new: false }],
    },
  ]);

  const [showEditSitesModal, setShowEditSitesModal] = useState(false);
  const [id, setId] = useState(null);

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
          <i className="bx bx-edit-alt"></i>
        </p>
      </div>
    ),
    created: user.created_at,
  }));

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
    if (url.length <= 7) {
      return url;
    }
    const truncatedUrl = url.substring(0, 15);
    return <>{truncatedUrl}...</>;
  };

  const siteData = siteInfo.map((site) => ({
    name: site.name,
    location: site.location,
    contact: site.contact || "N/A",
    inCamera: site.in_camera ? "Yes" : "No",
    outCamera: site.out_camera ? "Yes" : "No",
    in_url_trunc: createHref(site.in_url),
    out_url_trunc: createHref(site.out_url),
    users: site.users.length,
    hosts: site.hosts.length,
    guests: site.visits.filter((visit) => visit.is_new).length,
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
