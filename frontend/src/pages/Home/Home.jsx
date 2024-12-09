import React from "react";
import "./Home.css";
import HomeFootFall from "./HomeFootFall";

const Home = () => {
  const userDataJSON = localStorage.getItem("userData");

  // Parse userData into an object
  const userData = JSON.parse(userDataJSON);

  // Extract siteIds and siteNames from siteData array
  const siteData = userData?.siteData || [];
  const sites = siteData.map((site) => ({ id: site.id, name: site.name }));
  return (
    <div className="home__div__main">
      {sites.length === 0 ? (
        // Render a centered h1 element if no site data is available
        <h1 style={{ textAlign: "center", marginTop: "50px" }}>No site Data</h1>
      ) : (
        // Render HomeFootfall component for each site
        sites.map((site) => (
          <HomeFootFall key={site.id} siteId={site.id} siteName={site.name} />
        ))
      )}
    </div>
  );
};

export default Home;
