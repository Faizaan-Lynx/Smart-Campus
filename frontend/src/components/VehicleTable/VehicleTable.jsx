import React, { useEffect, useState, useCallback, useMemo } from "react";
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
import { Chip } from "@mui/material";
import RefreshIcon from "@mui/icons-material/Refresh";
import IconButton from "@mui/material/IconButton";
import CircularProgress from "@mui/material/CircularProgress";
import DirectionsCarIcon from "@mui/icons-material/DirectionsCar";
import AccessTimeIcon from "@mui/icons-material/AccessTime";
import CameraAltIcon from "@mui/icons-material/CameraAlt";
import ImageIcon from "@mui/icons-material/Image";
import DeleteOutlineIcon from "@mui/icons-material/DeleteOutline";
import VideocamIcon from "@mui/icons-material/Videocam";
import TrendingUpIcon from "@mui/icons-material/TrendingUp";
import SpeedIcon from "@mui/icons-material/Speed";
import FormatListNumberedIcon from "@mui/icons-material/FormatListNumbered";
import axios from "axios";
import { toast } from "react-toastify";
import BACKEND_URL from "../../config.js";
import "./VehicleTable.css";

// ── Styled cells ──────────────────────────────────────────────────────────────
const StyledTableCell = styled(TableCell)(({ theme }) => ({
  [`&.${tableCellClasses.head}`]: {
    fontSize: "14px",
    backgroundColor: "var(--card-bg)",
    color: "var(--text)",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  [`&.${tableCellClasses.body}`]: {
    fontSize: 13,
    color: "var(--text)",
    borderColor: "var(--border)",
  },
}));

const StyledTableRow = styled(TableRow)(() => ({
  "&:nth-of-type(even)": { backgroundColor: "var(--card-bg)", transition: "all 0.3s ease" },
  "&:nth-of-type(odd)": { backgroundColor: "var(--bg)", transition: "all 0.3s ease" },
  "&:last-child td, &:last-child th": { border: 0 },
  "&:hover": {
    backgroundColor: "rgba(16, 24, 40, 0.06) !important",
    boxShadow: "0 4px 12px rgba(16, 24, 40, 0.08)",
    transform: "translateY(-2px)",
  },
}));

// ── Image lightbox ────────────────────────────────────────────────────────────
function PlateImageModal({ licenseId, onClose }) {
  const [imgSrc, setImgSrc] = useState(null);
  const [imgError, setImgError] = useState(false);

  useEffect(() => {
    let objectUrl = null;
    let cancelled = false;

    const loadImage = async () => {
      const token = localStorage.getItem("token");
      try {
        // <img src="..."> cannot send an Authorization header, and this
        // endpoint requires one — so we fetch it via axios (which attaches
        // the bearer token like every other authenticated call) and turn
        // the response into a local blob URL the <img> tag can actually use.
        const response = await axios.get(
          `http://${BACKEND_URL}/license-plates/${licenseId}/image`,
          {
            responseType: "blob",
            headers: { Authorization: `Bearer ${token}` },
          }
        );
        if (cancelled) return;

        if (response.data.size === 0) {
          setImgError(true);
          return;
        }

        objectUrl = URL.createObjectURL(response.data);
        setImgSrc(objectUrl);
      } catch (err) {
        if (!cancelled) setImgError(true);
      }
    };

    loadImage();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [licenseId]);

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, zIndex: 9999,
        backgroundColor: "rgba(0,0,0,0.85)",
        display: "flex", alignItems: "center", justifyContent: "center",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--card-bg)", borderRadius: 12, padding: 24,
          border: "1px solid var(--accent)", maxWidth: "90vw",
        }}
      >
        {imgError ? (
          <p style={{ color: "#ef4444", padding: "40px 60px", textAlign: "center" }}>
            Failed to load image — it may have been deleted or you may not
            have access to this camera.
          </p>
        ) : imgSrc ? (
          <img
            src={imgSrc}
            alt={`Plate #${licenseId}`}
            style={{ maxWidth: "80vw", maxHeight: "70vh", borderRadius: 8 }}
            onError={() => setImgError(true)}
          />
        ) : (
          <div style={{ padding: "60px 100px", textAlign: "center" }}>
            <CircularProgress size={28} sx={{ color: "var(--accent)" }} />
          </div>
        )}
        <p style={{ color: "var(--muted)", textAlign: "center", marginTop: 10, fontSize: 12 }}>
          Detection #{licenseId} · Click outside to close
        </p>
      </div>
    </div>
  );
}

// ── Confidence badge ──────────────────────────────────────────────────────────
function ConfidenceBadge({ value }) {
  if (value == null) return <span style={{ color: "var(--muted)" }}>—</span>;
  const pct = Math.round(value * 100);
  const color = pct >= 80 ? "#22c55e" : pct >= 60 ? "#f59e0b" : "#ef4444";
  return (
    <Chip
      label={`${pct}%`}
      size="small"
      sx={{
        backgroundColor: `${color}22`, color,
        border: `1px solid ${color}`, fontWeight: 600, fontSize: 11,
      }}
    />
  );
}

// ── Stat card ─────────────────────────────────────────────────────────────────
function StatCard({ icon, label, value, tint }) {
  return (
    <div className="vt__stat-card">
      <div className="vt__stat-icon" style={{ color: tint, backgroundColor: `${tint}22`, border: `1px solid ${tint}40` }}>
        {icon}
      </div>
      <div>
        <div className="vt__stat-label">{label}</div>
        <div className="vt__stat-value">{value}</div>
      </div>
    </div>
  );
}

// ── Main component ─────────────────────────────────────────────────────────────
// selectedCameraId: when passed from Gate page, filters records to that camera
// cameras: the actual list of gate cameras (from Gate.jsx) used for the "Cams Online"
//          stat — falls back to counting distinct cameras seen in detection records
export default function VehicleTable({ selectedCameraId = null, cameras = null }) {
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [imageModal, setImageModal] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);

  // ── Fetch records ───────────────────────────────────────────────────────────
  const fetchLicensePlates = useCallback(async () => {
    setLoading(true);
    const token = localStorage.getItem("token");
    if (!token) { setLoading(false); return; }

    try {
      // If a specific camera is selected, fetch just that camera's records
      const url = selectedCameraId
        ? `http://${BACKEND_URL}/license-plates/camera/${selectedCameraId}`
        : `http://${BACKEND_URL}/license-plates/`;

      const response = await axios.get(url, {
        headers: { accept: "application/json", Authorization: `Bearer ${token}` },
        params: { limit: 500, offset: 0 },
      });

      const records = (response.data || []).map((r) => ({
        ...r,
        rawTimestamp: r.timestamp,
        timestamp: r.timestamp ? new Date(r.timestamp).toLocaleString() : "—",
      }));
      setData(records);
    } catch (error) {
      if (error.response?.status === 401) {
        toast.error("Session expired – please log in again.", { toastId: "lp-auth" });
      } else if (error.response?.status !== 404) {
        // 404 just means no records yet — don't show error
        toast.error("Failed to fetch vehicle records.", { toastId: "lp-fetch" });
      }
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [selectedCameraId]);

  useEffect(() => {
    fetchLicensePlates();
    // Auto-refresh every 30 s
    const interval = setInterval(fetchLicensePlates, 30_000);
    return () => clearInterval(interval);
  }, [fetchLicensePlates]);

  // Reset page when camera filter changes
  useEffect(() => { setPage(0); }, [selectedCameraId]);

  // ── Delete a record ─────────────────────────────────────────────────────────
  const confirmDelete = async () => {
    const id = confirmDeleteId;
    if (!id) {
      toast.error("This record does not have a valid ID.");
      setConfirmDeleteId(null);
      return;
    }

    console.log("[delete] confirm clicked, deleting id =", id);
    setConfirmDeleteId(null);
    setDeletingId(id);
    const token = localStorage.getItem("token");
    const url = `http://${BACKEND_URL}/license-plates/${encodeURIComponent(id)}`;
    console.log("[delete] sending DELETE to", url);
    try {
      const res = await axios.delete(url, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log("[delete] success", res.status, res.data);
      setData((prev) => prev.filter((r) => (r.id ?? r.license_id ?? r.licenseId) !== id));
      toast.success("Record deleted.");
    } catch (error) {
      console.error("[delete] failed:", error.response?.status, error.response?.data || error.message);
      const msg = error.response?.data?.detail || error.response?.data?.message;
      toast.error(msg ? `Delete failed: ${msg}` : `Delete failed (${error.response?.status || "network error"}).`);
    } finally {
      setDeletingId(null);
    }
  };

  // ── Stats ───────────────────────────────────────────────────────────────────
  const stats = useMemo(() => {
    const todayStr = new Date().toDateString();
    const detectionsToday = data.filter(
      (r) => r.rawTimestamp && new Date(r.rawTimestamp).toDateString() === todayStr
    ).length;

    const activeCameras = cameras ? cameras.length : new Set(data.map((r) => r.camera_id)).size;

    const latest = data.reduce((acc, r) => {
      if (!r.rawTimestamp) return acc;
      if (!acc || new Date(r.rawTimestamp) > new Date(acc.rawTimestamp)) return r;
      return acc;
    }, null);

    const confidences = data.map((r) => r.confidence).filter((c) => c != null);
    const avgConfidence = confidences.length
      ? Math.round((confidences.reduce((a, b) => a + b, 0) / confidences.length) * 100)
      : null;

    return {
      activeCameras,
      detectionsToday,
      latestPlate: latest?.license_number || "—",
      avgConfidence: avgConfidence != null ? `${avgConfidence}%` : "—",
      total: data.length,
    };
  }, [data, cameras]);

  // ── Search filter ───────────────────────────────────────────────────────────
  const filteredData = data.filter((row) => {
    if (!searchTerm) return true;
    const term = searchTerm.toLowerCase();
    return (
      (row.license_number || "").toLowerCase().includes(term) ||
      (row.timestamp || "").toLowerCase().includes(term) ||
      (row.camera_location || "").toLowerCase().includes(term) ||
      String(row.camera_id ?? "").includes(term)
    );
  });

  return (
    <div className="foottable__div__main">

      {/* ── Stat cards ────────────────────────────────────────────────────── */}
      <div className="vt__stats-row">
        <StatCard icon={<VideocamIcon fontSize="small" />} label="Cams Online" value={stats.activeCameras} tint="#22c55e" />
        <StatCard icon={<TrendingUpIcon fontSize="small" />} label="Detections Today" value={stats.detectionsToday} tint="#6366f1" />
        <StatCard icon={<DirectionsCarIcon fontSize="small" />} label="Latest Plate" value={stats.latestPlate} tint="#a78bfa" />
        <StatCard icon={<SpeedIcon fontSize="small" />} label="Avg Confidence" value={stats.avgConfidence} tint="#f59e0b" />
        <StatCard icon={<FormatListNumberedIcon fontSize="small" />} label="Total Detections" value={stats.total} tint="#ef4444" />
      </div>

      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 25 }}>
        <h3 style={{ margin: "0 0 16px 2px", color: "var(--text)", fontSize: 20, fontWeight: 600 }}>
          Vehicle Records
          {selectedCameraId && (
            <span style={{ color: "var(--accent)", fontSize: 14, fontWeight: 400, marginLeft: 8 }}>
              — Camera {selectedCameraId}
            </span>
          )}
        </h3>

        {/* Search bar */}
        <Paper elevation={3} sx={{
          backgroundColor: "var(--card-bg)", borderRadius: "12px", padding: "16px",
          border: "1px solid var(--border)", display: "flex", alignItems: "center", gap: "12px",
        }}>
          <TextField
            fullWidth variant="outlined" placeholder="Search by license plate, camera, or timestamp…"
            value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)}
            InputProps={{
              startAdornment: <InputAdornment position="start"><SearchIcon sx={{ color: "var(--accent)" }} /></InputAdornment>,
            }}
            sx={{
              "& .MuiOutlinedInput-root": {
                color: "var(--text)", borderRadius: "8px",
                "& fieldset": { borderColor: "var(--border)" },
                "&:hover fieldset": { borderColor: "var(--accent)" },
                "&.Mui-focused fieldset": { borderColor: "var(--accent)", boxShadow: "0 0 0 3px rgba(16,185,129,.1)" },
              },
              "& .MuiInputBase-input::placeholder": { color: "var(--muted)", opacity: 0.8 },
            }}
          />
          <IconButton
            aria-label="refresh" onClick={fetchLicensePlates} disabled={loading}
            sx={{
              color: "#fff", borderRadius: "8px", padding: "10px 16px",
              backgroundColor: "var(--accent)", boxShadow: "0 4px 12px rgba(16,24,40,.16)",
              "&:hover": { backgroundColor: "rgba(16,185,129,.9)" },
              "&.Mui-disabled": { backgroundColor: "#4b5563" },
            }}
          >
            {loading ? <CircularProgress size={20} sx={{ color: "#fff" }} /> : <RefreshIcon fontSize="small" />}
          </IconButton>
        </Paper>
      </div>

      {/* ── Table ────────────────────────────────────────────────────────────── */}
      <TableContainer component={Paper} sx={{
        borderRadius: "12px", backgroundColor: "var(--card-bg)",
        boxShadow: "0 8px 32px rgba(16,24,40,.08)", border: "1px solid var(--border)", overflow: "hidden",
      }}>
        <Table sx={{ minWidth: 800 }} aria-label="vehicle table">
          <TableHead>
            <TableRow>
              <StyledTableCell><AccessTimeIcon fontSize="small" sx={{ mr: 0.5 }} />Timestamp</StyledTableCell>
              <StyledTableCell><CameraAltIcon fontSize="small" sx={{ mr: 0.5 }} />Camera</StyledTableCell>
              <StyledTableCell><DirectionsCarIcon fontSize="small" sx={{ mr: 0.5 }} />License Plate</StyledTableCell>
              <StyledTableCell>Confidence</StyledTableCell>
              <StyledTableCell>Action</StyledTableCell>
            </TableRow>
          </TableHead>

          <TableBody>
            {loading && data.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={5} align="center" sx={{ padding: "40px !important" }}>
                  <CircularProgress size={32} sx={{ color: "var(--accent)" }} />
                  <p style={{ color: "var(--muted)", marginTop: 12 }}>Loading records…</p>
                </StyledTableCell>
              </StyledTableRow>
            ) : filteredData.length === 0 ? (
              <StyledTableRow>
                <StyledTableCell colSpan={5} align="center" sx={{ padding: "40px !important" }}>
                  <div style={{ color: "var(--muted)", textAlign: "center" }}>
                    <p style={{ fontSize: 16, fontWeight: 500 }}>No vehicle records found</p>
                    <p style={{ fontSize: 12, margin: 0 }}>
                      {selectedCameraId
                        ? `No detections yet for Camera ${selectedCameraId}. Start the LP worker above.`
                        : "Try adjusting your search filters."}
                    </p>
                  </div>
                </StyledTableCell>
              </StyledTableRow>
            ) : (
              filteredData
                .slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage)
                .map((row, index) => (
                  <StyledTableRow key={row.id || index}>
                    <StyledTableCell>{row.timestamp}</StyledTableCell>
                    <StyledTableCell>
                      <span style={{ display: "inline-flex", alignItems: "center", gap: 6, color: "var(--text)", fontSize: 13, fontWeight: 600 }}>
                        {row.camera_location || `Cam ${row.camera_id}`}
                      </span>
                    </StyledTableCell>
                    <StyledTableCell>
                      <span style={{ fontWeight: 700, color: "var(--accent)", fontSize: 14, letterSpacing: 1 }}>
                        {row.license_number || "—"}
                      </span>
                    </StyledTableCell>
                    <StyledTableCell>
                      <ConfidenceBadge value={row.confidence} />
                    </StyledTableCell>
                    <StyledTableCell>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        {row.file_path ? (
                          <button
                            onClick={() => setImageModal(row.id)}
                            style={{
                              padding: "7px 14px", backgroundColor: "var(--accent)", color: "#fff",
                              border: "none", borderRadius: 6, cursor: "pointer", fontSize: 12,
                              fontWeight: 600, display: "inline-flex", alignItems: "center", gap: 5,
                              transition: "background-color 0.2s ease",
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.backgroundColor = "rgba(16,185,129,0.9)"; }}
                            onMouseLeave={(e) => { e.currentTarget.style.backgroundColor = "var(--accent)"; }}
                          >
                            <ImageIcon fontSize="small" /> View
                          </button>
                        ) : (
                          <span style={{ color: "var(--muted)", fontSize: 12 }}>No image</span>
                        )}
                        <IconButton
                          aria-label="delete"
                          size="small"
                          onClick={() => {
                            const recordId = row.id ?? row.license_id ?? row.licenseId;
                            console.log("[delete] trash icon clicked, row id =", recordId);
                            setConfirmDeleteId(recordId ?? null);
                            if (!recordId) {
                              toast.error("This record does not have a valid ID.");
                              setConfirmDeleteId(null);
                            }
                            confirmDeleteId && confirmDelete();
                          }}
                          disabled={deletingId === row.id}
                          sx={{
                            color: "#ef4444", border: "1px solid #ef444460", borderRadius: "6px",
                            "&:hover": { backgroundColor: "#ef444422" },
                          }}
                        >
                          {deletingId === row.id
                            ? <CircularProgress size={14} sx={{ color: "#ef4444" }} />
                            : <DeleteOutlineIcon fontSize="small" />}
                        </IconButton>
                      </div>
                    </StyledTableCell>
                  </StyledTableRow>
                ))
            )}
          </TableBody>
        </Table>

        {filteredData.length > 0 && (
          <TablePagination
            rowsPerPageOptions={[5, 10, 20, 50]}
            component="div"
            count={filteredData.length}
            rowsPerPage={rowsPerPage}
            page={page}
            onPageChange={(_, newPage) => setPage(newPage)}
            onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
            sx={{
              backgroundColor: "var(--card-bg)",
              borderTop: "1px solid var(--border)",
              color: "var(--text)",
              "& .MuiTablePagination-toolbar": { paddingLeft: "20px", paddingRight: "12px", minHeight: "56px" },
              "& .MuiTablePagination-selectLabel, & .MuiTablePagination-displayedRows": {
                color: "var(--muted)", fontSize: 12.5, fontWeight: 500,
              },
              "& .MuiTablePagination-select": {
                color: "var(--text)", fontWeight: 700, fontSize: 13,
                backgroundColor: "rgba(255,255,255,0.04)", borderRadius: "8px",
                padding: "4px 24px 4px 10px !important",
              },
              "& .MuiTablePagination-selectIcon": { color: "var(--accent)" },
              "& .MuiTablePagination-actions": { marginLeft: "16px", display: "flex", gap: "4px" },
              "& .MuiIconButton-root": {
                color: "var(--text)", border: "1px solid var(--border)", borderRadius: "8px",
                margin: "0 2px", transition: "all 0.15s ease",
              },
              "& .MuiIconButton-root:hover:not(.Mui-disabled)": {
                color: "var(--accent)", borderColor: "var(--accent)",
                backgroundColor: "rgba(34,197,94,0.08)",
              },
              "& .MuiIconButton-root.Mui-disabled": { opacity: 0.35 },
            }}
          />
        )}
      </TableContainer>

      {imageModal !== null && (
        <PlateImageModal licenseId={imageModal} onClose={() => setImageModal(null)} />
      )}

      
    </div>
  );
}