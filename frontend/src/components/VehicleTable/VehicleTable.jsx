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
import TextField from "@mui/material/TextField"; // Import TextField for the search input
import InputAdornment from "@mui/material/InputAdornment"; // For search icon
import SearchIcon from "@mui/icons-material/Search"; // For search icon
import { color1 } from "../../utils"; // Assuming color1 is defined here
import FeedPopup from "../FootTable/FeedPopUp";
import axios from "axios";

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
  { Header: "Camera ID", accessor: "camera_id" },
  { Header: "License Plate", accessor: "license_number" },
];

export default function VehicleTable() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedFeed, setSelectedFeed] = useState(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState(""); // State for search term

  useEffect(() => {
    const fetchLicensePlates = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await axios.get("http://127.0.0.1:8000/license-plates/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Sort and format with local system time
        const sortedFormattedData = response.data
          .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp))
          .map(item => {
            const utcDate = new Date(item.timestamp + "Z"); // Append Z to mark UTC
            return {
              ...item,
              timestamp: utcDate.toLocaleString("en-GB", {
                day: "2-digit",
                month: "short",
                year: "numeric",
                hour: "2-digit",
                minute: "2-digit",
                hour12: true,
              }),
            };
          });

        setData(sortedFormattedData);

      } catch (error) {
        console.error("Error fetching license plates:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchLicensePlates();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFeedClick = async (licenseId) => {
    try {
      const token = localStorage.getItem("token");
      const response = await axios.get(
        `http://127.0.0.1:8000/license-plates/${licenseId}/image`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          responseType: "blob",
        }
      );

      if (response.headers["content-type"]?.startsWith("image/")) {
        console.log("License image blob received", response.data);
        setSelectedFeed(response.data);
      } else {
        const errorText = await response.data.text();
        console.error("Expected image, got:", errorText);
      }
    } catch (error) {
      console.error("Error fetching license image:", error);
    }
  };

  // Filtered data based on searchTerm
  const filteredData = data.filter((row) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      row.license_number.toLowerCase().includes(lowerCaseSearchTerm) ||
      row.timestamp.toLowerCase().includes(lowerCaseSearchTerm)
    );
  });

  return (
    <div className="foottable__div__main">
      <Paper elevation={3} sx={{ borderRadius: "11px", marginBottom: "20px", padding: "15px" }}>
        <TextField
          fullWidth
          variant="outlined"
          placeholder="Search by License Plate or Timestamp..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            sx: {
              borderRadius: "8px",
              "& fieldset": {
                borderColor: "#5e37ff", // Border color
              },
              "&:hover fieldset": {
                borderColor: "#5e37ff !important", // Hover border color
              },
              "&.Mui-focused fieldset": {
                borderColor: "#5e37ff !important", // Focused border color
              },
            },
          }}
          sx={{
            "& .MuiInputBase-input": {
              padding: "12px 14px",
            },
          }}
        />
      </Paper>

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
            {filteredData
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
                        className="feed-button"
                        onClick={() => handleFeedClick(row.id)}
                      >
                        View Feed
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
          count={filteredData.length} // Use filteredData length for pagination
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