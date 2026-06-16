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
import BACKEND_URL from '../../../config.js';

const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "15px",
    backgroundColor: "#1f2a40",
    color: theme.palette.common.white,
    fontWeight: "bold",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 12,
    color:"white",
    borderColor: "#141b2d"
  },
}));

const StyledTableRow = styled(TableRow)(({ theme }) => ({
  "&:nth-of-type(even)": {
    backgroundColor: "#1f2a40",
    color:"white"
  },
  "&:nth-of-type(odd)": {
    backgroundColor: "#1f2a40",
    color:"white"
  },
  "&:last-child td, &:last-child th": {
    border: 0,
  },
  "&:hover": {
    backgroundColor: "#1f2a40",
    color: "white",
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
        const response = await axios.get(`http://${BACKEND_URL}/users`, {
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
          await axios.delete(`http://${BACKEND_URL}/users/${id}`, {
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
      <div className="footfall__content__div" style={{ marginBottom: "20px" }}>
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          backgroundColor: "rgba(99, 102, 241, 0.05)",
          padding: "16px 20px",
          borderRadius: "8px",
          border: "1px solid #2a2f42",
        }}>
          <div>
            <p style={{
              margin: 0,
              fontSize: "16px",
              fontWeight: "600",
              color: "white",
            }}>
              All Users ({tableData.length})
            </p>
            <p style={{
              margin: "4px 0 0 0",
              fontSize: "12px",
              color: "#a1a5b7",
            }}>
              Manage user accounts and permissions
            </p>
          </div>
          <button
            onClick={() => setShowAddModal(!showAddModal)}
            style={{
              padding: "10px 20px",
              background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
              color: "white",
              border: "none",
              borderRadius: "8px",
              cursor: "pointer",
              fontWeight: "600",
              fontSize: "13px",
              transition: "all 0.3s ease",
              boxShadow: "0 4px 12px rgba(99, 102, 241, 0.3)",
              textTransform: "none",
            }}
            onMouseEnter={(e) => {
              e.target.style.transform = "translateY(-2px)";
              e.target.style.boxShadow = "0 6px 16px rgba(99, 102, 241, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.target.style.transform = "translateY(0)";
              e.target.style.boxShadow = "0 4px 12px rgba(99, 102, 241, 0.3)";
            }}
          >
            + Add User
          </button>
        </div>
      </div>

      {showEditSettingsModal && (
        <UsersAdminEditModal
          showEditSettingsModal={showEditSettingsModal}
          setShowEditSettingsModal={setShowEditSettingsModal}
          rowData={modalData}
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
        sx={{ 
          borderRadius: "12px",
          backgroundColor: "transparent",
          boxShadow: "0 8px 32px rgba(0, 0, 0, 0.3)",
          border: "1px solid #2a2f42",
          overflow: "hidden"
        }}
        className="table-container"
      >
        <Table sx={{ minWidth: 700 }} aria-label="customized table">
          <TableHead>
            <TableRow>
              {columns.map((column) => (
                <StyledTableCell key={column.Header} align="left">
                  <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                    {column.Header === "Ser No" && <span></span>}
                    {column.Header === "Name" && <span></span>}
                    {column.Header === "Email" && <span></span>}
                    {column.Header === "Assigned Cameras" && <span></span>}
                    {column.Header}
                  </div>
                </StyledTableCell>
              ))}
              <StyledTableCell align="left">
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                   Action
                </div>
              </StyledTableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {tableData.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={5} align="center" sx={{ padding: "40px !important" }}>
                  <div style={{ color: "#7a7e99", textAlign: "center" }}>
                    <p style={{ fontSize: "16px", fontWeight: "500" }}> No users found</p>
                    <p style={{ fontSize: "12px", margin: 0 }}>Click "Add User" to create a new user</p>
                  </div>
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              tableData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row) => {
                  const isAdmin = row.is_admin;
                  return (
                    <StyledTableRow key={row.id}>
                      {columns.map((column) => (
                        <StyledTableCell key={column.accessor} align="left">
                          <span style={{
                            fontWeight: column.accessor === "username" ? "600" : "400",
                            color: column.accessor === "username" ? "#a78bfa" : "#e0e0e0"
                          }}>
                            {column.accessor === "cameras"
                              ? isAdmin
                                ? "🟢 All cameras assigned"
                                : row[column.accessor]?.length > 0
                                ? `${row[column.accessor].length} camera(s)`
                                : "❌ No cameras"
                              : row[column.accessor]}
                          </span>
                        </StyledTableCell>
                      ))}
                      <StyledTableCell align="left">
                        <div
                          className="action-icons"
                          style={{
                            display: "flex",
                            gap: "10px",
                            alignItems: "center",
                          }}
                        >
                          <button
                            onClick={() => {
                              setModalData(row);
                              setShowEditSettingsModal(true);
                            }}
                            style={{
                              padding: "6px 12px",
                              background: "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: "600",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 6px rgba(99, 102, 241, 0.2)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #a78bfa 0%, #c4b5fd 100%)";
                              e.target.style.boxShadow = "0 4px 10px rgba(99, 102, 241, 0.3)";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #6366f1 0%, #a78bfa 100%)";
                              e.target.style.boxShadow = "0 2px 6px rgba(99, 102, 241, 0.2)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                           Edit
                          </button>
                          <button
                            onClick={() => deleteUser(row.id)}
                            style={{
                              padding: "6px 12px",
                              background: "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)",
                              color: "white",
                              border: "none",
                              borderRadius: "6px",
                              cursor: "pointer",
                              fontSize: "11px",
                              fontWeight: "600",
                              transition: "all 0.3s ease",
                              boxShadow: "0 2px 6px rgba(239, 68, 68, 0.2)",
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #dc2626 0%, #b91c1c 100%)";
                              e.target.style.boxShadow = "0 4px 10px rgba(239, 68, 68, 0.3)";
                              e.target.style.transform = "translateY(-1px)";
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = "linear-gradient(135deg, #ef4444 0%, #dc2626 100%)";
                              e.target.style.boxShadow = "0 2px 6px rgba(239, 68, 68, 0.2)";
                              e.target.style.transform = "translateY(0)";
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </StyledTableCell>
                    </StyledTableRow>
                  );
                })
            )}
          </TableBody>
        </Table>
        {tableData.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 15, 20, 25]}
            component="div"
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
            count={tableData.length}
            style={{color:'white'}}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(event, newPage) => setPage(newPage)}
            onRowsPerPageChange={(event) =>
              setRowsPerPage(parseInt(event.target.value, 10))
            }
          />
        )}
      </TableContainer>
      <Toaster />
    </div>
  );
};

export default UserAdmin;
