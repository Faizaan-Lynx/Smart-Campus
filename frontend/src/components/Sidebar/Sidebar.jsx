import React, { useEffect, useState } from "react";
import "./Sidebar.css";
import assets from "../../assets";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import { logout } from "../../redux/actions/authActions";
import { useDispatch } from "react-redux";
import { jwtDecode } from "jwt-decode";

const Sidebar = () => {
  const [isSidebarClosed, setSidebarClosed] = useState(true);
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const [userInfo, setUserInfo] = useState(null);
  const [siteData, setSiteData] = useState([]);
  console.log("Siderbar component",userInfo);
  useEffect(() => {
    const token = localStorage.getItem("token");
    console.log("Sidebar", token);
    if (token) {
      try {
        const decoded = jwtDecode(token);
        console.log("Decoded...", decoded);
        setUserInfo(decoded);
      } catch (error) {
        console.error("Error decoding token:", error);
      }
    }
  }, []);

  useEffect(() => {
    console.log("Updated User Info", userInfo);
  }, [userInfo]); // This will log when `userInfo` updates

  useEffect(() => {
    const userData = JSON.parse(localStorage.getItem("userData"));
    if (userData && userData.siteData) {
      setSiteData(userData.siteData);
    }
  }, [localStorage.getItem("userData")]);

  const handleToggleClick = () => {
    setSidebarClosed(!isSidebarClosed);
  };

  const handleMouseEnter = () => {
    setSidebarClosed(false);
  };

  const handleMouseLeave = () => {
    setSidebarClosed(true);
  };

  const alertandroute = () => {
    Swal.fire({
      title: "Logout",
      text: "Are you sure you want to log out?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Logout",
    }).then((result) => {
      if (result.isConfirmed) {
        localStorage.clear();
        dispatch(logout());
        navigate("/login");
      }
    });
  };

  return (
    <nav
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`sidebar ${isSidebarClosed ? "close" : ""} `}
    >
      <header>
        <div className="image-text">
          <span className="image">
            <img src={assets.lynx} alt="" />
          </span>
          <div className="text logo-text">
            <span className="name">LYNX</span>
            <span className="profession">Info-sec</span>
          </div>
        </div>
        <i
          className="bx bx-chevron-right toggle"
          onClick={handleToggleClick}
        ></i>
      </header>
      <div className="menu-bar">
        <div className="menu">
          {/* <li className="search-box">
            <i className="bx bx-search icon"></i>
            <input type="text" placeholder="Search..." />
          </li> */}
          <ul className="menu-links">
            {/* <li className="nav-link">
              <a onClick={() => navigate("/")}>
                <i className="bx bx-home-alt icon"></i>
                <span className="text nav-text">Home</span>
              </a>
            </li> */}
            <li className="nav-link">
              {/* <a onClick={() => navigate("/site/1")}> */}
              <a onClick={() => navigate("/")}>
                <i className="bx bx-sitemap icon"></i>
                <span className="text nav-text">Dashboard</span>
              </a>
            </li>

            {/* <li className="nav-link">
              <a onClick={() => navigate("/profile")}>
                <i className="bx bx-user icon"></i>
                <span className="text nav-text">Profile</span>
              </a>
            </li> */}
            {/* <li className="nav-link sites__link"> */}

            {!isSidebarClosed && (
              <>
                {" "}
                <div className="user__branches">
                  {siteData.map((site) => (
                    <p
                      key={site.id}
                      onClick={() => {
                        navigate(`/site/${site.id}`);
                        window.location.reload();
                      }}
                    >
                      <i class="bx bx-right-arrow-alt"></i>
                      &nbsp;{site.name}
                    </p>
                  ))}
                </div>
              </>
            )}
            <li className="nav-link">
              <a onClick={() => navigate("/contact")}>
                <i className="bx bx-phone icon"></i>
                <span className="text nav-text">Contact</span>
              </a>
            </li>

            {/* CCTV */}
            {/* <li className="nav-link">
              <a onClick={() => navigate("/CCTV")}>
                <i className="bx bx-camera icon"></i>
                <span className="text nav-text">CCTV</span>
              </a>
            </li> */}

            {userInfo?.role === "admin" && (
             
              <li className="nav-link">
                <a onClick={() => navigate("/settings")}>
                  <i className="bx bx-cog icon"></i>
                  <span className="text nav-text">Admin Panel</span>
                </a>
              </li>
            )}
            {/* <li className="nav-link">
              <a onClick={() => navigate("/settings")}>
                <i className="bx bx-cog icon"></i>
                <span className="text nav-text">Users</span>
              </a>
            </li> */}
            {/* 
            <li className="nav-link">
              <a onClick={() => navigate("/settings")}>
                <i className="bx bx-cog icon"></i>
                <span className="text nav-text">Users</span>
              </a>
            </li> */}
          </ul>
        </div>
        <div className="bottom-content">
          <li className="">
            <a href="#" onClick={() => alertandroute()}>
              <i className="bx bx-log-out icon"></i>
              <span className="text nav-text">Logout</span>
            </a>
          </li>
        </div>
      </div>
    </nav>
  );
};

export default Sidebar;
