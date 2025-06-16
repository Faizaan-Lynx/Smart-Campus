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
import axios from "axios";
import "./UserEntryAnalytics.css";

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "20px",
    backgroundColor: "#5e37ff",
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
  { Header: "Username", accessor: "username" },
  { Header: "License Plate", accessor: "license_plate" },
  { Header: "Entry Time", accessor: "entered_at_timestamp" },
];

export default function UserEntryAnalytics() {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchUserEntries = async () => {
      const token = localStorage.getItem("token");
      if (!token) return;

      try {
        const response = await axios.get("http://127.0.0.1:8000/users/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });

        // Sort and format with local system time
        const sortedFormattedData = response.data
          .sort((a, b) => new Date(b.entered_at_timestamp) - new Date(a.entered_at_timestamp))
          .map(item => {
            try {
              const utcDate = new Date(item.entered_at_timestamp + "Z"); // Append Z to mark UTC
              return {
                ...item,
                entered_at_timestamp: isNaN(utcDate.getTime()) ? "" : utcDate.toLocaleString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                  hour: "2-digit",
                  minute: "2-digit",
                  hour12: true,
                }),
              };
            } catch (error) {
              return {
                ...item,
                entered_at_timestamp: "",
              };
            }
          });

        setData(sortedFormattedData);
      } catch (error) {
        console.error("Error fetching user entries:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserEntries();
  }, []);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  // Filtered data based on searchTerm
  const filteredData = data.filter((row) => {
    if (!row) return false;
    
    const lowerCaseSearchTerm = searchTerm.toLowerCase();
    return (
      (row.username?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
      (row.license_plate?.toLowerCase() || '').includes(lowerCaseSearchTerm) ||
      (row.entered_at_timestamp?.toLowerCase() || '').includes(lowerCaseSearchTerm)
    );
  });

  return (
    <div className="user-analytics__main">
      <div className="user-analytics__content">
        <div className="dashboard__text">
          <p className="dash__text">User Entry Analytics</p>
        </div>
        <div className="foottable__div__main">
          <Paper elevation={3} sx={{ borderRadius: "11px", marginBottom: "20px", padding: "15px" }}>
            <TextField
              fullWidth
              variant="outlined"
              placeholder="Search by Username, License Plate or Entry Time..."
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
                    borderColor: "#5e37ff",
                  },
                  "&:hover fieldset": {
                    borderColor: "#5e37ff !important",
                  },
                  "&.Mui-focused fieldset": {
                    borderColor: "#5e37ff !important",
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
            <Table sx={{ minWidth: 700 }} aria-label="user entry table">
              <TableHead>
                <TableRow>
                  {columns.map((column) => (
                    <StyledTableCell key={column.Header} align="left">
                      {column.Header}
                    </StyledTableCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredData.length > 0 ? (
                  filteredData
                    .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                    .map((row, index) => (
                      <StyledTableRow key={index}>
                        {columns.map((column) => (
                          <StyledTableCell key={column.accessor} align="left">
                            {row[column.accessor] || ''}
                          </StyledTableCell>
                        ))}
                      </StyledTableRow>
                    ))
                ) : (
                  <StyledTableRow>
                    <StyledTableCell colSpan={columns.length} align="center">
                      No data found
                    </StyledTableCell>
                  </StyledTableRow>
                )}
              </TableBody>
            </Table>
            <TablePagination
              rowsPerPageOptions={[5, 10, 15, 20]}
              component="div"
              count={filteredData.length}
              rowsPerPage={rowsPerPage}
              page={page}
              onPageChange={handleChangePage}
              onRowsPerPageChange={handleChangeRowsPerPage}
            />
          </TableContainer>
        </div>
      </div>
    </div>
  );
} 