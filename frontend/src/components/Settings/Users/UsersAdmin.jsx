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
import { color1, localurl } from "../../../utils";
import "../../FootTable/FootTable.css";
import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import UsersAdminEditModal from "./UsersAdminEditModal";

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
  { Header: "Visit Date", accessor: "visitDate" },
  { Header: "Gender", accessor: "gender" },
  { Header: "Group", accessor: "group" },
  { Header: "New", accessor: "new" },
  { Header: "Time In", accessor: "timeIn" },
  // { Header: "Time Out", accessor: "timeOut" },
  // { Header: "Stay", accessor: "stay" },
];

const UserAdmin = ({ columns, data }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const [tableData, setTableData] = useState([]);

  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [modalData, setModalData] = useState();

  const extractTime = (fullTime) => {
    const [time] = fullTime.split(".");
    return time.substr(0, 5);
  };

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const deleteUser = async (id) => {
    Swal.fire({
      title: "Delete User",
      text: "Are you sure you want Delete the site?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const response = await axios.delete(`${localurl}/users/${id}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              Accept: "application/json",
            },
          });

          toast.dismiss();
          toast.success("User deleted successfully!");
          setTimeout(() => {
            window.location.reload();
          }, 1500);
        } catch (error) {
          console.error("Error deleting user:", error);
          if (
            error.response &&
            error.response.data &&
            error.response.data.detail
          ) {
            const errorMessage = error.response.data.detail;
            toast.error(errorMessage);
          } else {
            toast.error("An error occurred while deleting the user.");
          }
        }
      }
    });
  };

  return (
    <div className="foottable__div__main">
      <div className="footfall__content__div">
        <p>All Users</p>
      </div>
      {showEditSettingsModal && (
        <UsersAdminEditModal
          showEditSettingsModal={showEditSettingsModal}
          setShowEditSettingsModal={setShowEditSettingsModal}
          rowData={modalData}
        />
      )}
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
              <StyledTableCell align="left">Action</StyledTableCell>
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
                  <StyledTableCell align="center">
                    <div
                      className="action-icons"
                      style={{ display: "flex", justifyContent: "center" }}
                    >
                      <p
                        onClick={() => {
                          setModalData(row);
                          setShowEditSettingsModal(!showEditSettingsModal);
                        }}
                        style={{ cursor: "pointer", fontSize: "20px" }}
                      >
                        <i class="bx bx-edit-alt"></i>
                      </p>
                      <p
                        onClick={() => deleteUser(row.id)}
                        style={{
                          cursor: "pointer",
                          fontSize: "20px",
                          marginLeft: "5px",
                        }}
                      >
                        <i class="bx bx-trash"></i>
                      </p>

                      {/* <img
                        src={DeleteIcon}
                        onClick={() => deleteVisit(row.id)}
                        alt="Delete"
                        className="icon"
                      />
                      <img
                        src={EditIcon}
                        onClick={() => EditVisit(row.id)}
                        alt="Edit"
                        className="icon"
                      /> */}
                    </div>
                  </StyledTableCell>
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
      <Toaster />
    </div>
  );
};

export default UserAdmin;
