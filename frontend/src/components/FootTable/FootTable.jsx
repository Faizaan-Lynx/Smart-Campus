import React, { useEffect, useState } from "react";
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
    // backgroundColor: "#367f2b",
    // backgroundColor: "#9F9FED",
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
  // hide last border
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

const FootTable = ({ alerts }) => {
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
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <StyledTableRow key={row.id}>
                  {columns.map((column) => (
                    <StyledTableCell key={column.accessor} align="left">
                      {column.accessor === "file_path" ? (
                        <button className="feed-button" onClick={() => handleFeedClick(row.file_path)}>
                          View Feed
                        </button>
                      ) : column.accessor === "camera_id" ? (
                        `Camera ${row[column.accessor]}`
                      ) : column.accessor === "is_acknowledged" ? (
                        `${row[column.accessor]}` ) : (
                        row[column.accessor]
                      )}
                    </StyledTableCell>
                  ))}
                  <StyledTableCell align="center">
                    <div className="action-buttons">
                      <button className="acknowledge-button" onClick={() => console.log("Acknowledged", row.id)}>
                        Acknowledge
                      </button>
                      <button className="delete-button" onClick={() => console.log("Deleted", row.id)}>
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

      {selectedFeed && <FeedPopup filePath={selectedFeed} onClose={() => setSelectedFeed(null)} />}
    </div>
  );
};


export default FootTable;
