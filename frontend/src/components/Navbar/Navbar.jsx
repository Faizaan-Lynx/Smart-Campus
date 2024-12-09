import React from "react";
import "./Navbar.css";
import assets from "../../assets";

const Navbar = () => {
  const userDataString = localStorage.getItem("userData");

  const userData = JSON.parse(userDataString);

  // Get the username attribute from the userData object
  const username = userData ? userData.username : "Username";

  return (
    <>
      <header className="header" id="header">
        <nav className="nav container__nav">
          <div className="content__nav__div">
            <div className="name__div">
              <p>
                © 2024 <span className="bold__font">Lynx-Infosec</span>{" "}
              </p>

              <p>
                Hi, <span className="bold__font">{username}</span>
              </p>
            </div>
            <div className="name__div">
              <img src={assets.logo} alt="profile" />
            </div>
          </div>
        </nav>
      </header>
    </>
  );
};

export default Navbar;
