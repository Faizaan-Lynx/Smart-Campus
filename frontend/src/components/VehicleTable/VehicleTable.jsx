import React, { useEffect, useState } from "react";
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
import FeedPopup from "../FootTable/FeedPopUp";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "20px",
    backgroundColor: "#5e37ff", // Replace with `color1` if you use a theme variable
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
  { Header: "Vehicle Name", accessor: "vehicle_name" },
  { Header: "Name", accessor: "name" },
  { Header: "License Plate", accessor: "license_plate" },
];

export default function VehicleTable() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedFeed, setSelectedFeed] = useState(null);

  const data = [
    {
      id: 1,
      timestamp: "2025-05-21 08:45:23",
      vehicle_name: "Toyota Corolla",
      name: "John Doe",
      license_plate: "ABC-1234",
    },
    {
      id: 2,
      timestamp: "2025-05-21 09:15:10",
      vehicle_name: "Honda Civic",
      name: "Jane Smith",
      license_plate: "XYZ-5678",
    },
    {
      id: 3,
      timestamp: "2025-05-21 10:05:47",
      vehicle_name: "Ford F-150",
      name: "Mike Johnson",
      license_plate: "LMN-9012",
    },
    {
      id: 4,
      timestamp: "2025-05-21 10:30:15",
      vehicle_name: "Tesla Model 3",
      name: "Emily Brown",
      license_plate: "TES-2025",
    },
  ];

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

      const response = await axios.get(
        `http://127.0.0.1:8000/alerts/${alertId}/image`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob", // Expecting the response to be a blob (image)
        }
      );

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
        <Table sx={{ minWidth: 700 }} aria-label="vehicle table">
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
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <StyledTableRow key={row.id}>
                  {columns.map((column) => (
                    <StyledTableCell key={column.accessor} align="left">
                      {row[column.accessor]}
                    </StyledTableCell>
                  ))}
                  <StyledTableCell align="center">
                    <div className="action-buttons">
                      <button
                        className="acknowledge-button"
                        onClick={() => handleAcknowledge(row.id)}
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
          count={data.length}
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
}
