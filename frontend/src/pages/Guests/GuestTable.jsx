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
import { color1, localurl } from "../../utils";
import "../../components/FootTable/FootTable.css";
import axios from "axios";
import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import { toast, Toaster } from "react-hot-toast";
import { useNavigate } from "react-router-dom";

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

const GuestTable = ({ siteId, heading, columns, data }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  return (
    <div className="foottable__div__main">
      <div
        className="footfall__content__div"
        style={{ display: "flex", alignItems: "center" }}
      >
        <p>
          {heading}
          {""}
        </p>
      </div>
      <TableContainer
        component={Paper}
        sx={{ borderRadius: "11px" }}
        className="table-container"
      >
        <Table sx={{ minWidth: 700 }} aria-label="customized table">
          <TableHead>
            <TableRow>
              {columns.map((column, index) => (
                <StyledTableCell
                  key={column.Header}
                  align={index === 0 ? "left" : "left"} // Align the first column to the left and the rest to the right
                >
                  {column.Header}
                </StyledTableCell>
              ))}
              {/* <StyledTableCell align="left">Action</StyledTableCell> */}
            </TableRow>
          </TableHead>
          <TableBody>
            {data
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row, index) => (
                <StyledTableRow key={index}>
                  {columns.map((column, columnIndex) => (
                    <StyledTableCell
                      key={column.accessor}
                      align={columnIndex === 0 ? "left" : "left"}
                      component={columnIndex === 0 ? "th" : undefined}
                      scope={columnIndex === 0 ? "row" : undefined}
                    >
                      {row[column.accessor]}
                    </StyledTableCell>
                  ))}
                  {/* <StyledTableCell align="left">
                    <div className="action-icons" style={{ display: "flex" }}>
                      <p
                        onClick={() =>
                          navigate(`/host/${row.hostId}/visits/${siteId}`)
                        }
                        style={{ cursor: "pointer", fontSize: "20px" }}
                      >
                        <i class="bx bx-show"></i>
                      </p>
                      <p
                        onClick={() => {
                          setModalData(row);
                          setShowEditHostModal(!showEditHostModal);
                        }}
                        style={{
                          cursor: "pointer",
                          fontSize: "20px",
                          marginLeft: "5px",
                        }}
                      >
                        <i class="bx bx-edit-alt"></i>
                      </p>
                      <p
                        onClick={() => handleDelete(row.hostId, row.siteId)}
                        style={{
                          cursor: "pointer",
                          fontSize: "20px",
                          marginLeft: "5px",
                        }}
                      >
                        <i class="bx bx-trash"></i>
                      </p>
                    </div>
                  </StyledTableCell> */}
                </StyledTableRow>
              ))}
            {/* {rows
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <StyledTableRow key={row.name}>
                  <StyledTableCell component="th" scope="row">
                    {row.name}
                  </StyledTableCell>
                  <StyledTableCell align="right">
                    {row.calories}
                  </StyledTableCell>
                  <StyledTableCell align="right">{row.fat}</StyledTableCell>
                  <StyledTableCell align="right">{row.carbs}</StyledTableCell>
                  <StyledTableCell align="right">{row.protein}</StyledTableCell>
                  <StyledTableCell align="right">{row.protein}</StyledTableCell>
                </StyledTableRow>
              ))} */}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 15, 20, 25]}
          component="div"
          count={data?.length > 0 ? data.length : 0}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>
    </div>
  );
};

export default GuestTable;
