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

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "20px",
    backgroundColor: color1,
    color: theme.palette.common.white,
    fontWeight: "bold",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 14,
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: "#fff",
  },
  "&:nth-of-type(odd)": {
    backgroundColor: theme.palette.action.hover,
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
}));

const columns = [
  { Header: "Timestamp", accessor: "timestamp" },
  { Header: "Location (Camera ID)", accessor: "camera_id" },
  { Header: "Status", accessor: "is_acknowledged" },
  { Header: "Feed", accessor: "file_path" },
];

const FootTable = ({ alerts, setAlerts }) => {
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

  const handleFeedClick = (filePath) => {
    console.log("Feed Clicked", filePath);
    setSelectedFeed(filePath);
  };

  const handleAcknowledge = async (alertId) => {
    const token = localStorage.getItem("token");
    try {
      await axios.patch(
        `http://127.0.0.1:8000/alerts/${alertId}/acknowledge`,
        {
          is_acknowledged: true,
        },
        {
          headers: {
            accept: "application/json",
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        }
      );

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
      await axios.delete(`http://127.0.0.1:8000/alerts/${alertId}`, {
        headers: {
          accept: "application/json",
          "Content-Type": "application/json",
          Authorization: `Bearer ${token})}`,
        },
      });

      // Update the alert list locally
      setAlerts((prevAlerts) =>
        prevAlerts.filter((alert) => alert.id !== alertId)
      );
    } catch (error) {
      console.error("Failed to delete alert:", error);
    }
  };

  return (
    <div className="foottable__div__main">
      <TableContainer component={Paper} sx={{ borderRadius: "11px" }}>
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
              .sort((a, b) => b.id - a.id)
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <StyledTableRow key={row.id}>
                  {columns.map((column) => (
                    <StyledTableCell key={column.accessor} align="left">
                      {column.accessor === "file_path" ? (
                        <button
                          className="feed-button"
                          onClick={() => handleFeedClick(row.file_path)}
                        >
                          View Feed
                        </button>
                      ) : column.accessor === "camera_id" ? (
                        `Camera ${row[column.accessor]}`
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
