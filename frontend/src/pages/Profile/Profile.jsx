import React, { useEffect, useState } from "react";
import "./Profile.css";
import assets from "../../assets";
// import BoxRow from "../../components/BoxDataRow/BoxRow";
import ProfileBoxRow from "../../components/ProfileBoxRow/ProfileBoxRow";
import SitesTableProfile from "./SitesTableProfile/SitesTableProfile";
import axios from "axios";
import { localurl } from "../../utils";
import EditProfileModal from "./EditProfileModal";
import { useNavigate } from "react-router-dom";

const Profile = () => {
  const [userData, setUserData] = useState(null);
  const [showEditProfileModal, setShowEditProfileModal] = useState(false);
  const navigate = useNavigate();
  const columns = [
    { Header: "Name", accessor: "name" },
    { Header: "Location", accessor: "location" },
    { Header: "Contact", accessor: "contact" },
    { Header: "In Camera", accessor: "inCamera" },
    { Header: "Out Camera", accessor: "outCamera" },
    { Header: "In url", accessor: "in_url_trunc" },
    { Header: "Out url", accessor: "out_url_trunc" },
    { Header: "Guests", accessor: "hosts" },
    { Header: "Host", accessor: "host" },
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

  const [data, setData] = useState([]);
  useEffect(() => {
    // Update data when user sites change
    if (userData && userData.sites) {
      const newData = userData.sites.map((site) => ({
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
        protocol: site.protocol || 0,
        sensitivity: site.sensitivity || 0,
        fps: site.fps || 0,
        threshold: site.threshold || 0,
        rotation: site.rotation || 0,
        reg_pts: site.reg_pts || 0,
        crop_area: site.crop_area || 0,
        hosts: (
          <p
            onClick={() => navigate(`/guests/${site.id}`)}
            style={{ cursor: "pointer", fontSize: "20px" }}
          >
            <i class="bx bx-show"></i>
          </p>
          // <img
          //   onClick={() => navigate(`/guests/${site.id}`)}
          //   src={ViewIcon}
          //   alt="View"
          //   className="icon"
          // />
        ),
        host: (
          <p
            onClick={() => navigate(`/hosts/${site.id}`)}
            style={{ cursor: "pointer", fontSize: "20px" }}
          >
            <i class="bx bx-show"></i>
          </p>
          // <img
          //   onClick={() => navigate(`/hosts/${site.id}`)}
          //   src={ViewIcon}
          //   alt="View"
          //   className="icon"
          // />
        ),
      }));
      setData(newData);
      // console.log(data); // Update data state with mapped array
    }
  }, [userData]);

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await axios.get(`${localurl}/dashboard/`, {
          headers: {
            accept: "application/json",
            Authorization: `Bearer ${localStorage.getItem("token")}`,
          },
        });
        setUserData(response.data);

        const userData = response.data;
        const { username, id: userId, sites } = userData;
        // Extract site ids from sites array
        // Extract site ids and names from sites array
        const siteData = sites.map((site) => ({
          id: site.id,
          name: site.name,
        }));
        const userDataToStore = { username, userId, siteData };
        localStorage.setItem("userData", JSON.stringify(userDataToStore));
      } catch (error) {
        console.error("Error fetching user:", error);
      }
    };
    fetchUser();
  }, []);

  return (
    <div className="profile__div__main">
      {showEditProfileModal && (
        <EditProfileModal
          userData={userData}
          showEditProfileModal={showEditProfileModal}
          setShowEditProfileModal={setShowEditProfileModal}
        />
      )}
      <div class="wrapper">
        <div class="img-area">
          <div class="inner-area">
            <img src={assets.logo} alt="" />
          </div>
        </div>
        {/* <div class="icon arrow">
          <i class="fas fa-arrow-left"></i>
        </div> */}
        <div onClick={() => setShowEditProfileModal(true)} class="icon dots">
          <i class="fas fa-edit"></i>
        </div>
        <div class="name">{userData?.username}</div>
        <div class="about">{userData?.email || "none"}</div>
        <ProfileBoxRow userData={userData} />
        {/* <div class="buttons">
          <button>Message</button>
          <button>Subscribe</button>
        </div> */}
      </div>
      <div className="sites__table__profile__div">
        <SitesTableProfile columns={columns} data={data} />
      </div>
    </div>
  );
};

export default Profile;
