import React from "react";
import "./ProfileBoxRow.css";
import assets from "../../assets";

const ProfileBoxRow = ({ userData }) => {
  return (
    <div className="box__main__div">
      {[1, 2].map((item) => (
        <div className="card" key={item}>
          <img src={assets.logo} alt={`Card ${item}`} className="card-image" />
          <div className="card-content">
            <p className="stat_1">Total sites</p>
            <p className="stat_2">{userData?.sites.length}</p>
            {/* <p className="stat_3">Stat 3</p> */}
          </div>
        </div>
      ))}
    </div>
  );
};

export default ProfileBoxRow;
