import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import axios from "axios";
import { localurl } from "../../utils";
import HostTable from "./HostTable";

const Hosts = () => {
  const { siteId } = useParams();

  const [hostData, setHostData] = useState([]);

  const columns = [
    { Header: "Name", accessor: "name" },

    { Header: "Gender", accessor: "gender" },
    { Header: "Visits", accessor: "visits" },
    { Header: "Site ID", accessor: "siteId" },
    { Header: "Vector", accessor: "vector" },
  ];

  const getGenderValue = (isFemale) => {
    return isFemale ? "Female" : "Male";
  };

  useEffect(() => {
    const fetchHostsData = async () => {
      try {
        const response = await axios.get(
          `${localurl}/dashboard/sites/${siteId}/hosts`,
          {
            headers: {
              accept: "application/json",
              Authorization: `Bearer ${localStorage.getItem("token")}`,
            },
          }
        );
        // console.log(response.data.hosts);
        const formattedData = response.data.hosts
          .filter((host) => host.is_host)
          .map((host) => {
            // Calculate total visits
            const totalVisits = host.visits.reduce(
              (total, visit) => total + 1, // Increment by 1 for each visit
              0 // Initial value of total visits
            );
            const genderValue = getGenderValue(host.is_female);
            const gender =
              genderValue === "Male" || genderValue === "Female"
                ? genderValue
                : null;
            return {
              hostId: host.id,
              name: host.name,
              vector: host.vector,
              gender: gender,
              visits: totalVisits, // Total visits calculation
              siteId: host.site_id,
            };
          });

        if (formattedData.length > 1) {
          formattedData.reverse();
        }
        // Set the state with the reversed or original array
        setHostData(formattedData);
      } catch (error) {
        console.error("Error fetching hosts data:", error);
      }
    };

    fetchHostsData();
  }, []);
  // console.log(hostData);
  return (
    <div style={{ marginTop: "60px", marginLeft: "103px", padding: "10px" }}>
      <HostTable
        siteId={siteId}
        heading="Hosts"
        columns={columns}
        data={hostData}
      />
    </div>
  );
};

export default Hosts;
