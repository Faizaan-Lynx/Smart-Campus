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
import "../../../components/FootTable/FootTable.css";
import { Toaster, toast } from "react-hot-toast";
import axios from "axios";

import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import { useNavigate } from "react-router-dom";
import AddSiteModal from "./AddSiteModal";
import EditSiteModal from "./EditSiteModal";

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

const SitesTableProfile = ({ columns, data }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = React.useState(5);
  const navigate = useNavigate();

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [modalData, setModalData] = useState();

  const deletesite = async (siteId) => {
    Swal.fire({
      title: "Delete Site",
      text: "Are you sure you want to delete site?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        await axios
          .delete(`${localurl}/dashboard/sites/${siteId}`, {
            headers: {
              Authorization: `Bearer ${localStorage.getItem("token")}`,
              "Content-Type": "application/json",
              accept: "application/json",
            },
          })
          .then((response) => {
            toast.dismiss();
            toast.success("Site Deleted!");
            setTimeout(() => {
              window.location.reload();
            }, 1000);
          })
          .catch((error) => {
            console.error("Error deleting site:", error);
            // Handle error scenario
            toast.error("Error deleting site!");
          });
      }
    });
  };

  const refreshUrl = async (id) => {
    await axios
      .get(`${localurl}/dashboard/sites/${id}/urlin`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem("token")}`,
          accept: "application/json",
        },
      })
      .then((response) => {
        toast.dismiss();
        toast.success("URL's refreshed");
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      })
      .catch((error) => {
        console.error("Error refreshing site.", error);
        // Handle error scenario
        toast.error("Error refreshing site.");
      });
  };

  return (
    <div className="foottable__div__main">
      {showAddModal && (
        <AddSiteModal
          showAddModal={showAddModal}
          setShowAddModal={setShowAddModal}
        />
      )}
      {showEditModal && (
        <EditSiteModal
          showEditModal={showEditModal}
          setShowEditModal={setShowEditModal}
          rowData={modalData}
        />
      )}
      <p
        className="my_sites_profile"
        style={{ marginBottom: "20px", display: "flex", alignItems: "center" }}
      >
        MY SITES &nbsp;
        {/* <i
          onClick={() => setShowAddModal(!showAddModal)}
          style={{ fontSize: "27px", cursor: "pointer" }}
          class="bx bxs-plus-square"
        ></i> */}
      </p>
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
              <StyledTableCell align="left">Refresh URL</StyledTableCell>
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
                        onClick={() => navigate(`/site/${row.siteId}`)}
                        style={{ cursor: "pointer", fontSize: "20px" }}
                      >
                        <i class="bx bx-show"></i>
                      </p>
                      <p
                        onClick={() => {
                          setModalData(row);
                          setShowEditModal(!showEditModal);
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
                        onClick={() => deletesite(row.siteId)}
                        style={{
                          cursor: "pointer",
                          fontSize: "20px",
                          marginLeft: "5px",
                        }}
                      >
                        <i class="bx bx-trash"></i>
                      </p>
                    </div>
                  </StyledTableCell>
                  <StyledTableCell align="left">
                    <div className="action-icons">
                      <p
                        onClick={() => refreshUrl(row.siteId)}
                        style={{ cursor: "pointer", fontSize: "24px" }}
                      >
                        <i class="bx bx-refresh"></i>
                      </p>
                    </div>
                  </StyledTableCell>
                </StyledTableRow>
              ))}
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

export default SitesTableProfile;
