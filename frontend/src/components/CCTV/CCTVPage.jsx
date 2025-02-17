import React, { useState } from "react";
import "./CCTVPage.css";
import { CiCamera } from "react-icons/ci";
import { FaArrowRight, FaArrowLeft, FaTimes } from "react-icons/fa"; // Import icons

const CCTVPage = () => {
  const feeds = Array.from({ length: 32 }, (_, index) => ({
    id: index + 1,
    name: `Camera ${index + 1}`,
    src: `https://via.placeholder.com/300x200?text=Camera+${index + 1}`, // Placeholder for feed
  }));

  const [page, setPage] = useState(0);
  const [selectedFeed, setSelectedFeed] = useState(null);

  const feedsPerPage = 16; // 4x4 grid layout

  const handleNextPage = () => {
    if ((page + 1) * feedsPerPage < feeds.length) {
      setPage(page + 1);
    }
  };

  const handlePrevPage = () => {
    if (page > 0) {
      setPage(page - 1);
    }
  };

  const handleFeedClick = (feed) => {
    setSelectedFeed(feed);
  };

  return (
    <div className="cctv-container">

      {/* CCTV Grid */}
      <div className="cctv-grid">
        {feeds.slice(page * feedsPerPage, (page + 1) * feedsPerPage).map((feed) => (
          <div key={feed.id} className="cctv-feed" onClick={() => handleFeedClick(feed)}>
            <div className="feed-thumbnail">
              <CiCamera size={50} className="feed-icon" />
            </div>
            <p className="feed-text">{feed.name}</p>
          </div>
        ))}
      </div>

      {/* Pagination Controls */}
      <div className="pagination-controls">
        <button className="scroll-button left" onClick={handlePrevPage} disabled={page === 0}>
          <FaArrowLeft />
        </button>

        <span className="page-indicator">
          Page {page + 1} of {Math.ceil(feeds.length / feedsPerPage)}
        </span>

        <button className="scroll-button right" onClick={handleNextPage} disabled={(page + 1) * feedsPerPage >= feeds.length}>
          <FaArrowRight />
        </button>
      </div>

      {/* Expanded Feed Popup */}
      {selectedFeed && (
        <div className="feed-popup">
          <div className="feed-popup-content">
            <button className="cctv-close-button" onClick={() => setSelectedFeed(null)}>
              <FaTimes />
            </button>
            <h3>{selectedFeed.name}</h3>
            <img src={selectedFeed.src} alt={selectedFeed.name} className="feed-image" />
          </div>
        </div>
      )}
    </div>
  );
};

export default CCTVPage;
