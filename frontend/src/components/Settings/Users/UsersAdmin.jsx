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
import { color1 } from "../../../utils";
import "../../FootTable/FootTable.css";
import Swal from "sweetalert2/dist/sweetalert2.js";
import "sweetalert2/src/sweetalert2.scss";
import { toast, Toaster } from "react-hot-toast";
import axios from "axios";
import UsersAdminEditModal from "./UsersAdminEditModal";
import UserAdminAddModal from "./UserAdminAddModal";

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

const UserAdmin = ({ columns }) => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [tableData, setTableData] = useState([]);
  const [userData, setUserData] = useState([]);
  const [showEditSettingsModal, setShowEditSettingsModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [modalData, setModalData] = useState();

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const token = localStorage.getItem("token");
        const response = await axios.get("http://127.0.0.1:8000/users", {
          headers: {
            Authorization: `Bearer ${token}`,
            Accept: "application/json",
          },
        });
        setTableData(response.data);
        console.log("Users:", response.data);
      } catch (error) {
        console.error("Error fetching users:", error);
        toast.error("Failed to load users");
      }
    };
    fetchUsers();
  },[]);

  const deleteUser = async (id) => {
    Swal.fire({
      title: "Delete User",
      text: "Are you sure you want to delete this user?",
      icon: "warning",
      showCancelButton: true,
      confirmButtonColor: "#3085d6",
      cancelButtonColor: "#d33",
      confirmButtonText: "Delete",
    }).then(async (result) => {
      if (result.isConfirmed) {
        try {
          const token = localStorage.getItem("token");
          await axios.delete(`http://127.0.0.1:8000/users/${id}`, {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: "application/json",
            },
          });

          toast.success("User deleted successfully!");
          setTableData((prevData) => prevData.filter((user) => user.id !== id));
        } catch (error) {
          console.error("Error deleting user:", error);
          toast.error("An error occurred while deleting the user.");
        }
      }
    });
  };

  //User Update
  const handleUserUpdate = (updatedUser) => {
    setTableData((prevData) =>
      prevData.map((user) =>
        user.id === updatedUser.id ? { ...user, ...updatedUser } : user
      )
    );
  
    // If the edited user is the one currently in the modal, update modalData
    if (modalData?.id === updatedUser.id) {
      setModalData((prev) => ({
        ...prev,
        ...updatedUser,
      }));
    }
  };
  
  //Camera Update
  const handleCameraUpdate = (updatedUser) => {
    setTableData((prevData) =>
      prevData.map((user) =>
        user.id === updatedUser.id
          ? { ...user, cameras: updatedUser.cameras }
          : user
      )
    );

    // If the edited user is the one currently in the modal, update modalData
    if (modalData?.id === updatedUser.id) {
      setModalData((prev) => ({
        ...prev,
        cameras: updatedUser.came,
      }));
    }
  };

  return (
    <div className="foottable__div__main">
      <div className="footfall__content__div">
        <p
          style={{
            marginBottom: "20px",
            display: "flex",
            alignItems: "center",
          }}
        >
          All Users
          <i
            onClick={() => setShowAddModal(!showAddModal)}
            style={{ fontSize: "27px", cursor: "pointer" }}
            className="bx bxs-plus-square"
          ></i>
        </p>
      </div>

      {showEditSettingsModal && (
        <UsersAdminEditModal
          showEditSettingsModal={showEditSettingsModal}
          setShowEditSettingsModal={setShowEditSettingsModal}
          rowData={modalData} // Ensure modal gets the latest data
          onUpdateUser={handleUserUpdate}
          onUpdateCameras={handleCameraUpdate}
        />
      )}

      {showAddModal && (
        <UserAdminAddModal
          showAddUserModal={showAddModal}
          setShowAddUserModal={setShowAddModal}
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
              {columns.map((column) => (
                <StyledTableCell key={column.Header} align="left">
                  {column.Header}
                </StyledTableCell>
              ))}
              <StyledTableCell align="left">Action</StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => {
                const isAdmin = row.is_admin;
                return (
                <StyledTableRow key={row.id}>
                  {columns.map((column) => (
                    <StyledTableCell key={column.accessor} align="left">
                      {column.accessor === "cameras"
                          ? isAdmin
                            ? "All cameras assigned"
                            : row[column.accessor]?.join(", ") || "No Cameras Assigned"
                          : row[column.accessor]}
                    </StyledTableCell>
                  ))}
                  <StyledTableCell align="center">
                    <div
                      className="action-icons"
                      style={{
                        display: "flex",
                        justifyContent: "center",
                        gap: "15px",
                      }}
                    >
                      <p
                        onClick={() => {
                          setModalData(row);
                          setShowEditSettingsModal(true);
                        }}
                        style={{
                          cursor: "pointer",
                          fontSize: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i className="bx bx-edit-alt"></i>
                      </p>
                      <p
                        onClick={() => deleteUser(row.id)}
                        style={{
                          cursor: "pointer",
                          fontSize: "20px",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                        }}
                      >
                        <i className="bx bx-trash"></i>
                      </p>
                    </div>
                  </StyledTableCell>
                </StyledTableRow>
              )})}
          </TableBody>
        </Table>
        <TablePagination
          rowsPerPageOptions={[5, 10, 15, 20, 25]}
          component="div"
          count={tableData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={(event, newPage) => setPage(newPage)}
          onRowsPerPageChange={(event) =>
            setRowsPerPage(parseInt(event.target.value, 10))
          }
        />
      </TableContainer>
      <Toaster />
    </div>
  );
};

export default UserAdmin;
