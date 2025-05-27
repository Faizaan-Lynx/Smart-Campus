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
        setData(response.data);
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
