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

function createData(name, calories, fat, carbs, protein) {
  return { name, calories, fat, carbs, protein };
}

const rows = [
  createData("Frozen yoghurt", 159, 6.0, 24, 4.0),
  createData("Ice cream sandwich", 237, 9.0, 37, 4.3),
  createData("Eclair", 262, 16.0, 24, 6.0),
  createData("Cupcake", 305, 3.7, 67, 4.3),
  createData("Gingerbread", 356, 16.0, 49, 3.9),
  createData("Jelly Bean", 375, 0.0, 94, 0.0),
  createData("Lollipop", 392, 0.2, 98, 0.0),
  createData("Honeycomb", 408, 3.2, 87, 6.5),
  createData("Donut", 452, 25.0, 51, 4.9),
  createData("KitKat", 518, 26.0, 65, 7.0),
];

// const columns = [
//   { Header: "TimeStamp", accessor: "timestamp" },
//   { Header: "Location", accessor: "location" },
//   { Header: "Status", accessor: "status" },
//   // { Header: "Visit Date", accessor: "visitDate" },
//   // { Header: "Gender", accessor: "gender" },
//   // { Header: "Group", accessor: "group" },
//   // { Header: "New", accessor: "new" },
//   // { Header: "Time In", accessor: "timeIn" },
//   // { Header: "Time Out", accessor: "timeOut" },
//   // { Header: "Stay", accessor: "stay" },
// ];

// const FootTable = ({ visitData }) => {
//   const [page, setPage] = useState(0);
//   const [rowsPerPage, setRowsPerPage] = React.useState(5);
//   const [tableData, setTableData] = useState([]);

//   useEffect(() => {
//     try {
//       if (visitData) {
//         const extractedData = visitData.map((visit) => ({
//           id: visit.id,
//           new: visit.is_new ? "Yes" : "No",
//           gender: visit.is_female
//             ? "Female"
//             : visit.is_female === false
//             ? "Male"
//             : "Unknown",
//           group: visit.is_group ? "Yes" : "No",
//           stay: calculateStay(visit.time_in, visit.time_out),
//           timeIn: visit.time_in ? extractTime(visit.time_in) : "",
//           timeOut: visit.time_out ? extractTime(visit.time_out) : "",
//           visitDate: visit.date_in,
//         }));
//         if (extractedData.length > 1) {
//           extractedData.reverse();
//         }
//         setTableData(extractedData);
//       }
//     } catch (error) {
//       console.error("Error fetching data:", error);
//     }
//   }, [visitData]);

//   const calculateStay = (timeIn, timeOut) => {
//     // Parse the timeIn and timeOut strings into hours, minutes, and seconds
//     const [hoursIn, minutesIn, secondsIn] = timeIn.split(":").map(Number);

//     // If timeOut is provided, parse it; otherwise, use the current time
//     let totalMinutesOut;
//     if (timeOut) {
//       const [hoursOut, minutesOut, secondsOut] = timeOut.split(":").map(Number);
//       totalMinutesOut = hoursOut * 60 + minutesOut + secondsOut / 60;
//     } else {
//       const now = new Date();
//       totalMinutesOut =
//         now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;
//     }

//     // Convert the parsed timeIn into minutes
//     const totalMinutesIn = hoursIn * 60 + minutesIn + secondsIn / 60;

//     // Calculate the difference in minutes
//     const diff = totalMinutesOut - totalMinutesIn;

//     // If the difference is zero or negative, it means the user has not left yet
//     // if (diff <= 0) {
//     //   return "Not left";
//     // }

//     return `${Math.floor(diff)} minutes`;
//   };

//   // const calculateStay = (timeIn, timeOut) => {
//   //   const startTime = new Date(`1970-01-01T${timeIn}Z`);
//   //   const endTime = new Date(`1970-01-01T${timeOut}Z`);
//   //   const diff = endTime - startTime;
//   //   if (!Math.floor(diff / 60000)) {
//   //     return "Not left";
//   //   }
//   //   return Math.floor(diff / 60000);
//   // };

//   const extractTime = (fullTime) => {
//     const [time] = fullTime.split(".");
//     return time.substr(0, 5);
//   };

//   const handleChangePage = (event, newPage) => {
//     setPage(newPage);
//   };

//   const handleChangeRowsPerPage = (event) => {
//     setRowsPerPage(parseInt(event.target.value, 10));
//     setPage(0);
//   };
//   return (
//     <div className="foottable__div__main">
//       <TableContainer
//         component={Paper}
//         sx={{ borderRadius: "11px" }}
//         className="table-container"
//       >
//         <Table sx={{ minWidth: 700 }} aria-label="customized table">
//           <TableHead>
//             <TableRow>
//               {columns.map((column, index) => (
//                 <StyledTableCell
//                   key={column.Header}
//                   align={index === 0 ? "left" : "left"} // Align the first column to the left and the rest to the right
//                 >
//                   {column.Header}
//                 </StyledTableCell>
//               ))}
//               <StyledTableCell align="left">Action</StyledTableCell>
//             </TableRow>
//           </TableHead>
//           <TableBody>
//             {tableData
//               .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//               .map((row, index) => (
//                 <StyledTableRow key={index}>
//                   {columns.map((column, columnIndex) => (
//                     <StyledTableCell
//                       key={column.accessor}
//                       align={columnIndex === 0 ? "left" : "left"}
//                       component={columnIndex === 0 ? "th" : undefined}
//                       scope={columnIndex === 0 ? "row" : undefined}
//                     >
//                       {row[column.accessor]}
//                     </StyledTableCell>
//                   ))}
//                   <StyledTableCell align="center">
//                     <div className="action-icons">
//                       <p>hello</p>
//                       {/* <img
//                         src={DeleteIcon}
//                         onClick={() => deleteVisit(row.id)}
//                         alt="Delete"
//                         className="icon"
//                       />
//                       <img
//                         src={EditIcon}
//                         onClick={() => EditVisit(row.id)}
//                         alt="Edit"
//                         className="icon"
//                       /> */}
//                     </div>
//                   </StyledTableCell>
//                 </StyledTableRow>
//               ))}
//             {/* {rows
//               .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
//               .map((row) => (
//                 <StyledTableRow key={row.name}>
//                   <StyledTableCell component="th" scope="row">
//                     {row.name}
//                   </StyledTableCell>
//                   <StyledTableCell align="right">
//                     {row.calories}
//                   </StyledTableCell>
//                   <StyledTableCell align="right">{row.fat}</StyledTableCell>
//                   <StyledTableCell align="right">{row.carbs}</StyledTableCell>
//                   <StyledTableCell align="right">{row.protein}</StyledTableCell>
//                   <StyledTableCell align="right">{row.protein}</StyledTableCell>
//                 </StyledTableRow>
//               ))} */}
//           </TableBody>
//         </Table>
//         <TablePagination
//           rowsPerPageOptions={[5, 10, 15, 20, 25]}
//           component="div"
//           count={visitData?.length > 0 ? visitData.length : 0}
//           rowsPerPage={rowsPerPage}
//           page={page}
//           onPageChange={handleChangePage}
//           onRowsPerPageChange={handleChangeRowsPerPage}
//         />
//       </TableContainer>
//     </div>
//   );
// };

const columns = [
  { Header: "Timestamp", accessor: "timestamp" },
  { Header: "Location (Camera ID)", accessor: "location" },
  { Header: "Status", accessor: "status" },
  { Header: "Feed", accessor: "feed" },

];

const sampleData = [
  {
    id: 1,
    timestamp: "2025-02-06 14:32:00",
    location: "Camera A1",
    status: "Acknowledged",
    feed: "View Feed",
  },
  {
    id: 2,
    timestamp: "2025-02-06 14:35:45",
    location: "Camera B3",
    status: "Pending",
    feed: "View Feed",

  },
  {
    id: 3,
    timestamp: "2025-02-06 14:40:10",
    location: "Camera C2",
    status: "Acknowledged",
    feed: "View Feed",

  },
  {
    id: 4,
    timestamp: "2025-02-06 14:45:30",
    location: "Camera D4",
    status: "Pending",
    feed: "View Feed",

  },
];

// const FeedPopup = ({ row, onClose }) => {
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState(null);
//   const [feedContent, setFeedContent] = useState("");

//   // Simulate API Call
//   React.useEffect(() => {
//     setLoading(true);
//     setError(null);

//     setTimeout(() => {
//       // Simulating API response
//       if (Math.random() > 0.2) {
//         setFeedContent(`Live feed data for ${row.location}`);
//         setLoading(false);
//       } else {
//         setError("Failed to load feed. Please try again.");
//         setLoading(false);
//       }
//     }, 2000);
//   }, [row]);

//   return (
//     <div className="popup-overlay">
//       <div className="popup-content">
//         <h3>Camera Feed - {row.location}</h3>
//         {loading ? (
//           <div className="loader">Loading...</div>
//         ) : error ? (
//           <div className="error-message">{error}</div>
//         ) : (
//           <p>{feedContent}</p>
//         )}
//         <button className="close-button" onClick={onClose}>Close</button>
//       </div>
//     </div>
//   );
// };


// Main Table Component
const FootTable = () => {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(5);
  const [selectedRow, setSelectedRow] = useState(null);

  const handleChangePage = (event, newPage) => {
    setPage(newPage);
  };

  const handleChangeRowsPerPage = (event) => {
    setRowsPerPage(parseInt(event.target.value, 10));
    setPage(0);
  };

  const handleFeedClick = (row) => {
    setSelectedRow(row);
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
            {sampleData
              .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
              .map((row) => (
                <StyledTableRow key={row.id}>
                  {columns.map((column) => (
                    <StyledTableCell key={column.accessor} align="left">
                      {column.accessor === "feed" ? (
                        <button className="feed-button" onClick={() => handleFeedClick(row)}>
                          {row[column.accessor]}
                        </button>
                      ) : (
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
          count={sampleData.length}
          rowsPerPage={rowsPerPage}
          page={page}
          onPageChange={handleChangePage}
          onRowsPerPageChange={handleChangeRowsPerPage}
        />
      </TableContainer>

      {selectedRow && <FeedPopup row={selectedRow} onClose={() => setSelectedRow(null)} />}
    </div>
  );
};

export default FootTable;
