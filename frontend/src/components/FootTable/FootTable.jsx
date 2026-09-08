import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import "./FootTable.css";
import { FaEye, FaTrash, FaSearch } from "react-icons/fa";
import FeedPopup from "./FeedPopUp";
import BACKEND_URL from '../../config.js';


const PAGE_SIZE = 8;

const FootTable = ({ alerts, setAlerts, cameras = [] }) => {
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [page, setPage] = useState(1);

  const handleFeedClick = async (alertId) => {
    console.log("Feed Clicked", alertId);
  
    try {
      const token = localStorage.getItem("token");
  
      const response = await axios.get(`http://${BACKEND_URL}/alerts/${alertId}/image`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
        responseType: 'blob', // Expecting the response to be a blob (image)
      });
  
      if (response.headers["content-type"]?.startsWith("image/")) {
        console.log("Image blob received", response.data);
        setSelectedFeed(response.data); // Set the blob directly to state
      } else {
        const errorText = await response.data.text();
        console.error("Expected image, got:", errorText);
      }
    } catch (error) {
      console.error("Error fetching the image:", error);
    }
  };
  
  

  const handleDelete = async (alertId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`http://${BACKEND_URL}/alerts/${alertId}`, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });
  
      // Update the alert list locally
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };
  

  const getCameraName = (camera_id) => {
    const cam = cameras.find((c) => c.id === camera_id);
    return cam?.location || `Camera ${camera_id}`;
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return "";
    const date = new Date(timestamp);
    if (!Number.isNaN(date.valueOf())) {
      return date.toISOString().slice(0, 10);
    }
    return timestamp.slice(0, 10);
  };

  const filteredAlerts = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();
    if (!term) return alerts;

    return alerts.filter((row) => {
      const cameraName = getCameraName(row.camera_id).toLowerCase();
      const timestamp = formatDate(row.timestamp).toLowerCase();
      return cameraName.includes(term) || timestamp.includes(term);
    });
  }, [alerts, searchTerm]);

  const totalPages = Math.max(1, Math.ceil(filteredAlerts.length / PAGE_SIZE));
  const paginatedAlerts = useMemo(
    () => filteredAlerts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE),
    [filteredAlerts, page]
  );

  useEffect(() => {
    setPage(1);
  }, [searchTerm]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  const pageNumbers = useMemo(() => {
    const maxVisible = 5;
    let start = Math.max(1, page - 2);
    let end = Math.min(totalPages, start + maxVisible - 1);
    start = Math.max(1, end - maxVisible + 1);
    const numbers = [];
    for (let i = start; i <= end; i += 1) numbers.push(i);
    return numbers;
  }, [page, totalPages]);

  return (
    <div className="foottable__div__main">
      <div className="alert-card-search">
        <input
          type="text"
          placeholder="Search camera or date"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
        />
        <button type="button" className="alert-card-search__button" aria-label="Search alerts">
          <FaSearch />
        </button>
      </div>

      <div className="alert-card-list-container">
        {filteredAlerts.length === 0 ? (
          <div className="alert-card-empty">No alerts match your search.</div>
        ) : (
          <div className="alert-card-list">
            {paginatedAlerts.map((row) => {
              const name = getCameraName(row.camera_id);
              const alertType = row.alert_type || row.type || "Intrusion";

              return (
                <div className="alert-card" key={row.id}>
                  <div className="alert-card__left">
                    <div className="alert-card__camera-name">{name}</div>
                  </div>

                  <div className="alert-card__center">
                    <span className="alert-card__date">{formatDate(row.timestamp)}</span>
                    <span className="alert-card__type-text">{alertType}</span>
                  </div>

                  <div className="alert-card__right">
                    <button
                      className="alert-card__button alert-card__button--icon alert-card__button--view"
                      onClick={() => handleFeedClick(row.id)}
                      aria-label="View Alert"
                    >
                      <FaEye />
                    </button>
                    <button
                      className="alert-card__button alert-card__button--icon alert-card__button--delete"
                      onClick={() => handleDelete(row.id)}
                      aria-label="Delete Alert"
                    >
                      <FaTrash />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {totalPages > 1 && (
        <div className="alert-card-pagination">
          <button
            type="button"
            className="alert-card-pagination__btn"
            onClick={() => setPage((value) => Math.max(1, value - 1))}
            disabled={page === 1}
            aria-label="Previous page"
          >
            ‹
          </button>
          {pageNumbers.map((number) => (
            <button
              key={number}
              type="button"
              className={`alert-card-pagination__btn ${number === page ? "alert-card-pagination__btn--active" : ""}`}
              onClick={() => setPage(number)}
              aria-label={`Page ${number}`}
            >
              {number}
            </button>
          ))}
          <button
            type="button"
            className="alert-card-pagination__btn"
            onClick={() => setPage((value) => Math.min(totalPages, value + 1))}
            disabled={page === totalPages}
            aria-label="Next page"
          >
            ›
          </button>
        </div>
      )}

      {selectedFeed && (
        <FeedPopup filePath={selectedFeed} onClose={() => setSelectedFeed(null)} />
      )}
    </div>
  );
};

export default FootTable;
