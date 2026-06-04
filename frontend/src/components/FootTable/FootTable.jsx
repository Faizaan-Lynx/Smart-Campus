import React, { useEffect, useState } from "react";
import axios from "axios";
import "./FootTable.css";
import { styled } from "@mui/material/styles";
import Table from "@mui/material/Table";
import TableBody from "@mui/material/TableBody";
import TableCell, { tableCellClasses } from "@mui/material/TableCell";
import TableContainer from "@mui/material/TableContainer";
import TableHead from "@mui/material/TableHead";
import TableRow from "@mui/material/TableRow";
import Paper from "@mui/material/Paper";
import TablePagination from "@mui/material/TablePagination";
import { color1 } from "../../utils";
import FeedPopup from "./FeedPopUp";
import BACKEND_URL from '../../config.js';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "16px",
    backgroundColor: "#1a2538",
    color: theme.palette.common.white,
    fontWeight: "bold",
    borderColor: "white"
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 12,
    borderColor: "#141b2d",
    color:'white'
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: "#1f2a40",
    
  },
  "&:nth-of-type(odd)": {
    backgroundColor: "#1f2a40",
    
  },
  "&:last-child td, &:last-child th": {
    border: 0,
    backgroundColor:'#1f2a40'
  },
}));

const columns = [
  { Header: "Timestamp", accessor: "timestamp" },
  { Header: "Location", accessor: "camera_id" },
  { Header: "Status", accessor: "is_acknowledged" },
  { Header: "View Image", accessor: "file_path" },
];

const FootTable = ({ alerts, setAlerts, cameras = [] }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedFeed, setSelectedFeed] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

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
  
  

  const handleAcknowledge = async (alertId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(`http://${BACKEND_URL}/alerts/${alertId}/acknowledge`, {
        is_acknowledged: true,
      }, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      // Update the alert list locally
      setAlerts((prevAlerts) =>
        prevAlerts.map((alert) =>
          alert.id === alertId ? { ...alert, is_acknowledged: true } : alert
        )
      );
    } catch (error) {
      console.error("Failed to acknowledge alert:", error);
    }
  };

  const handleDelete = async (alertId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.delete(`http://${BACKEND_URL}/alerts/${alertId}`,
      {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token})}`,
        },
      }
      );
  
      // Update the alert list locally
      setAlerts((prevAlerts) => prevAlerts.filter((alert) => alert.id !== alertId));
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };
  

  return (
    <div className="foottable__div__main">
      <TableContainer component={Paper} sx={{ borderRadius: 0}}>
        <Table sx={{ minWidth: 700 }} aria-label="customized table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <StyledTableCell key={column.Header} align="left">
                  {column.Header}
                </StyledTableCell>
              ))}
              <StyledTableCell align="left">Actions</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {alerts
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <StyledTableRow key={row.id}>
                  {columns.map((column) => (
                    <StyledTableCell key={column.accessor} align="left">
                      {column.accessor === "file_path" ? (
                        <button
                          className="feed-button"
                          onClick={() => handleFeedClick(row.id)}
                        >
                          View Feed
                        </button>
                      ) : column.accessor === "camera_id" ? (
                        <span className="nowrap-location">
                          {(() => {
                            const cam = cameras.find(c => c.id === row.camera_id);
                            return cam && cam.location ? cam.location : `Camera ${row.camera_id}`;
                          })()}
                        </span>
                      ) : column.accessor === "is_acknowledged" ? (
                        row[column.accessor] ? (
                          "✅ Acknowledged"
                        ) : (
                          "❌ Pending"
                        )
                      ) : (
                        row[column.accessor]
                      )}
                    </StyledTableCell>
                  ))}
                  <StyledTableCell align="center">
                    <div className="action-buttons">
                      <button
                        className="acknowledge-button"
                        onClick={() => handleAcknowledge(row.id)}
                        disabled={row.is_acknowledged}
                      >
                        Acknowledge
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => handleDelete(row.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 15, 20]}
          component="div"
          style={{backgroundColor:'#1f2a40',color:'whitesmoke',fontSize:14}}
          count={alerts.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {selectedFeed && (
        <FeedPopup
          filePath={selectedFeed}
          onClose={() => setSelectedFeed(null)}
        />
      )}
    </div>
  );
};

export default FootTable;
