import React, { useContext } from "react";
import "./Navbar.css";
import assets from "../../assets";
import { jwtDecode } from "jwt-decode";  // ✅ Correct way for ESM modules
import { ThemeContext } from "../../context/ThemeContext";

const Navbar = () => {
  const { theme, toggle } = useContext(ThemeContext);
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
                © 2026 <span className="bold__font">Lynx-Infosec</span>{" "}
              </p>

              <p>
                Hi, <span className="bold__font">{username}</span>
              </p>
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                onClick={toggle}
                aria-label={theme === "light" ? "Switch to dark mode" : "Switch to light mode"}
                style={{
                  padding: "6px 10px",
                  borderRadius: 6,
                  border: "none",
                  cursor: "pointer",
                  background: theme === "light" ? "var(--card-bg)" : "var(--header-bg)",
                  color: "var(--text)",
                }}
              >
                {theme === "light" ? "🌙 Dark" : "☀️ Light"}
              </button>
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
