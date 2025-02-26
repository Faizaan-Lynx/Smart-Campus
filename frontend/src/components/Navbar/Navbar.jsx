import React from "react";
import "./Navbar.css";
import assets from "../../assets";
import { jwtDecode } from "jwt-decode";  // ✅ Correct way for ESM modules

const Navbar = () => {
  const token = localStorage.getItem("token"); // Get JWT token from localStorage
  let username = "Username"; // Default username if not found

  if (token) {
    try {
      const decodedToken = jwtDecode(token); // Decode JWT
      username = decodedToken.sub || "Username"; // Extract username from token
    } catch (error) {
      console.error("Invalid token:", error);
      localStorage.removeItem("token"); // Remove token if it's invalid
    }
  }

  return (
    <>
      <header className="header" id="header">
        <nav className="nav container__nav">
          <div className="content__nav__div">
            <div className="name__div">
              <p>
                © 2025 <span className="bold__font">Lynx-Infosec</span>{" "}
              </p>

              <p>
                Hi, <span className="bold__font">{username}</span>
              </p>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
