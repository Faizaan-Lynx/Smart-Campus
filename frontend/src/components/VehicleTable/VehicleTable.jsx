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
import TextField from "@mui/material/TextField";
import InputAdornment from "@mui/material/InputAdornment";
import SearchIcon from "@mui/icons-material/Search";
import { color1 } from "../../utils";
import FeedPopup from "../FootTable/FeedPopUp";
import axios from "axios";
import { Select, MenuItem, FormControl } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import BACKEND_URL from '../../config.js';
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CameraAltIcon from "@mui/icons-material/CameraAlt";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "14px",
    backgroundColor: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
    backgroundImage: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
    color: theme.palette.common.white,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 13,
    color: "#e0e0e0",
    borderColor: "#2a2f42",
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: "#1f2a40",
    transition: "all 0.3s ease",
  },
  "&:nth-of-type(odd)": {
    backgroundColor: "#242d42",
    transition: "all 0.3s ease",
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
  "&:hover": {
    backgroundColor: "#2c3652 !important",
    boxShadow: "0 4px 12px rgba(99, 102, 241, 0.1)",
    transform: "translateY(-2px)",
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
  const [searchTerm, setSearchTerm] = useState("");
  const [searchField, setSearchField] = useState("license_number");

  const fetchLicensePlates = async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }
  };

  useEffect(() => {
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
  };

  const filteredData = data.filter((row) => {
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    if (!searchTerm) return true;
    if (searchField === "license_number") {
      return row.license_number.toLowerCase().includes(lowerCaseSearchTerm);
    } else if (searchField === "timestamp") {
      return row.timestamp.toLowerCase().includes(lowerCaseSearchTerm);
    } else if (searchField === "camera_id") {
      return String(row.camera_id).toLowerCase().includes(lowerCaseSearchTerm);
    }
    return false;
  });

  const getPlaceholderText = () => {
    switch (searchField) {
      case "license_number":
        return "Search by License Plate (e.g., XXX-1234)...";
      case "timestamp":
        return "Search by Timestamp (e.g., 02 jun 2025)...";
      case "camera_id":
        return "Search by Camera ID (e.g., 11, 13, 14)...";
      default:
        return "Search...";
    }
  };

  return (
    <div className="foottable__div__main"  >
      <div style={{ marginBottom: "25px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px", marginBottom: "16px" }}>
          <h3 style={{ margin: 0, marginLeft:2, color: "#fff", fontSize: "20px", fontWeight: "600" }}>
             Vehicle Records
          </h3>
          <span style={{ color: "#a1a5b7", fontSize: "12px" }}>
            Total: {filteredData.length} vehicles
          </span>
        </div>
        
        <Paper elevation={3} sx={{ 
          backgroundColor: "#1f2a40", 
          color: 'white', 
          borderRadius: "12px", 
          padding: "16px",
          border: "1px solid #2a2f42",
          display: "flex", 
          alignItems: "center", 
          gap: "12px"
        }}>
          <TextField
            fullWidth
            variant="outlined"
            placeholder={getPlaceholderText()}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: "#6366f1" }} />
                </InputAdornment>
              ),
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "#fff",
                borderRadius: "8px",
                "& fieldset": {
                  borderColor: "#6366f1",
                  transition: "all 0.3s ease",
                },
                "&:hover fieldset": {
                  borderColor: "#8b5cf6",
                },
                "&.Mui-focused fieldset": {
                  borderColor: "#a78bfa",
                  boxShadow: "0 0 0 3px rgba(99, 102, 241, 0.1)",
                },
              },
              "& .MuiInputBase-input::placeholder": {
                color: "#7a7e99",
                opacity: 0.8,
              },
            }}
          />
          <FormControl variant="standard" sx={{ minWidth: 150 }}>
            <Select
              value={searchField}
              onChange={(e) => setSearchField(e.target.value)}
              disableUnderline
              sx={{ 
                fontSize: "13px", 
                color: "#a78bfa", 
                fontWeight: "600",
                background: "transparent",
              }}
            >
              <MenuItem value="license_number">License Plate</MenuItem>
              <MenuItem value="timestamp">Timestamp</MenuItem>
              <MenuItem value="camera_id">Camera ID</MenuItem>
            </Select>
          </FormControl>
          <IconButton
            aria-label="refresh"
            onClick={fetchLicensePlates}
            disabled={loading}
            sx={{
              backgroundColor: 'linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)',
              color: '#fff',
              borderRadius: "8px",
              padding: "10px 16px",
              boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)',
              transition: 'all 0.3s ease',
              '&:hover': {
                backgroundColor: '#a78bfa',
                boxShadow: '0 6px 16px rgba(99, 102, 241, 0.4)',
                transform: 'scale(1.05)',
              },
              '&.Mui-disabled': {
                backgroundColor: '#4b5563',
              },
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: '#fff' }} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Paper>
      </div>

      <TableContainer component={Paper} sx={{ 
        borderRadius: "12px", 
        backgroundColor: "transparent",
        boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
        border: "1px solid #2a2f42",
        overflow: "hidden"
      }}>
        <Table sx={{ minWidth: 700 }} aria-label="vehicle table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <StyledTableCell key={column.Header} align="left">
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {column.Header === "License Plate" && <DirectionsCarIcon fontSize="small" />}
                    {column.Header === "Timestamp" && <AccessTimeIcon fontSize="small" />}
                    {column.Header === "Camera ID" && <CameraAltIcon fontSize="small" />}
                    {column.Header}
                  </div>
                </StyledTableCell>
              ))}
              <StyledTableCell align="left">
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                  ⚙️ Actions
                </div>
              </StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={4} align="center" sx={{ padding: "40px !important" }}>
                  <div style={{ color: "#7a7e99", textAlign: "center" }}>
                    <p style={{ fontSize: "16px", fontWeight: "500" }}>No vehicle records found</p>
                    <p style={{ fontSize: "12px", margin: 0 }}>Try adjusting your search filters</p>
                  </div>
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <StyledTableRow key={row.id || index}>
                    {columns.map((column) => (
                      <StyledTableCell key={column.accessor} align="left">
                        <span style={{ 
                          fontWeight: column.accessor === "license_number" ? "600" : "400",
                          color: column.accessor === "license_number" ? "#a78bfa" : "#e0e0e0"
                        }}>
                          {row[column.accessor]}
                        </span>
                      </StyledTableCell>
                    ))}
                    <StyledTableCell align="left">
                      <button
                        className="feed-button"
                        onClick={() => handleFeedClick(row.id)}
                        style={{
                          padding: "8px 16px",
                          backgroundColor: "#6366f1",
                          color: "white",
                          border: "none",
                          borderRadius: "6px",
                          cursor: "pointer",
                          fontSize: "12px",
                          fontWeight: "600",
                          transition: "all 0.3s ease",
                          boxShadow: "0 2px 8px rgba(99, 102, 241, 0.2)",
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = "#a78bfa";
                          e.target.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.4)";
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = "#6366f1";
                          e.target.style.boxShadow = "0 2px 8px rgba(99, 102, 241, 0.2)";
                        }}
                      >
                        View Feed
                      </button>
                    </StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>
        {filteredData.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 15, 20]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={handleChangePage}
            onRowsPerPageChange={handleChangeRowsPerPage}
            sx={{
              backgroundColor: "#1f2a40",
              borderTop: "1px solid #2a2f42",
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                color: "#e0e0e0",
              },
              "& .MuiIconButton-root": {
                color: "#a78bfa",
              },
            }}
          />
        )}
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