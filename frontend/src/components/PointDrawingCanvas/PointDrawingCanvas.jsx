import React, { useRef, useEffect, useState } from "react";
import "./PointDrawingCanvas.css";

const PointDrawingCanvas = ({ videoUrl, onPointsChange, initialPoints = "" }) => {
  const canvasRef = useRef(null);
  const imgRef = useRef(null);

  const [points, setPoints] = useState([]);
  const [polygons, setPolygons] = useState([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Reset image states whenever videoUrl changes
  useEffect(() => {
    setImageError(false);
    setImageLoaded(false);
  }, [videoUrl]);

  // ----------------------------
  // Parse initial points
  // ----------------------------
  useEffect(() => {
    if (initialPoints && typeof initialPoints === "string") {
      try {
        const cleanStr = initialPoints.replace(/\(/g, "[").replace(/\)/g, "]");
        const parsed = JSON.parse(cleanStr);

        if (Array.isArray(parsed) && parsed.length > 0) {
          if (Array.isArray(parsed[0]) && Array.isArray(parsed[0][0])) {
            setPolygons(parsed);
          } else {
            setPolygons([parsed]);
          }
        }
      } catch (e) {
        console.log("Could not parse initial points:", e);
      }
    }
  }, [initialPoints]);

  // ----------------------------
  // Draw function
  // ----------------------------
  const drawCanvas = () => {
    const canvas = canvasRef.current;
    const img = imgRef.current;

    if (!canvas || !img || !imageLoaded) return;

    const ctx = canvas.getContext("2d");
    // Always render canvas at stream resolution (640x480)
    const width = 640;
    const height = 480;

    canvas.width = width;
    canvas.height = height;

    ctx.clearRect(0, 0, width, height);

    // ----------------------------
    // Draw polygons
    // ----------------------------
    polygons.forEach((polygon) => {
      if (polygon.length >= 3) {
        ctx.fillStyle = "rgba(128, 0, 0, 0.3)";
        ctx.strokeStyle = "rgb(0, 128, 0)";
        ctx.lineWidth = 2;

        ctx.beginPath();
        ctx.moveTo(polygon[0][0], polygon[0][1]);

        polygon.forEach((p) => ctx.lineTo(p[0], p[1]));

        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        polygon.forEach((p) => {
          ctx.fillStyle = "rgb(0, 0, 255)";
          ctx.beginPath();
          ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
          ctx.fill();
        });
      }
    });

    // ----------------------------
    // Draw current points
    // ----------------------------
    points.forEach((p, i) => {
      ctx.fillStyle = "red";
      ctx.beginPath();
      ctx.arc(p[0], p[1], 3, 0, Math.PI * 2);
      ctx.fill();

      if (i > 0) {
        ctx.strokeStyle = "green";
        ctx.lineWidth = 2;
        ctx.beginPath();
        ctx.moveTo(points[i - 1][0], points[i - 1][1]);
        ctx.lineTo(p[0], p[1]);
        ctx.stroke();
      }
    });
  };

  // ----------------------------
  // Redraw when needed
  // ----------------------------
  useEffect(() => {
    if (!imageLoaded) return;
    drawCanvas();
  }, [points, polygons, imageLoaded]);

  // ----------------------------
  // Click handlers
  // ----------------------------
  const handleCanvasClick = (e) => {
    if (!isDrawing) return;

    const canvas = canvasRef.current;
    const img = imgRef.current;
    if (!canvas || !img) return;

    // Camera streams are always resized to 640x480 on the backend.
    // Scale click position from displayed canvas size → 640x480 coordinate space.
    const rect = canvas.getBoundingClientRect();
    const STREAM_W = 640;
    const STREAM_H = 480;

    const x = Math.round((e.nativeEvent.offsetX / rect.width)  * STREAM_W);
    const y = Math.round((e.nativeEvent.offsetY / rect.height) * STREAM_H);

    setPoints((prev) => [...prev, [x, y]]);
  };

  const handleRightClick = (e) => {
    e.preventDefault();

    if (isDrawing && points.length >= 3) {
      const newPolygons = [...polygons, points];
      setPolygons(newPolygons);
      setPoints([]);
      onPointsChange?.(newPolygons);
    }
  };

  // ----------------------------
  // Controls
  // ----------------------------
  const undoLastPoint = () => {
    setPoints((prev) => prev.slice(0, -1));
  };

  const undoLastPolygon = () => {
    setPolygons((prev) => {
      const updated = prev.slice(0, -1);
      onPointsChange?.(updated);
      return updated;
    });
  };

  const resetCanvas = () => {
    setPoints([]);
    setPolygons([]);
    onPointsChange?.([]);
  };

  return (
    <div className="point-drawing-canvas-container">
      <div className="canvas-instructions">
        <p>📌 <strong>Instructions:</strong></p>
        <ul>
          <li><strong>Left Click</strong> to add points</li>
          <li><strong>Right Click</strong> to close polygon</li>
          <li><strong>Start Drawing</strong> before interacting</li>
        </ul>
      </div>

      <div style={{ position: "relative", width: "100%", maxWidth: "800px" }}>
        {!videoUrl && (
          <div style={{ padding: "32px", textAlign: "center", color: "var(--muted)", border: "1px dashed var(--border)", borderRadius: "4px", background: "var(--card-bg)" }}>
            No camera frame available.
          </div>
        )}
        {videoUrl && imageError && (
          <div style={{ padding: "32px", textAlign: "center", color: "#c00", border: "1px dashed var(--danger, #f5c6cb)", borderRadius: "4px", background: "var(--card-bg)" }}>
            ⚠️ Failed to load camera frame. The stream may be unavailable.
          </div>
        )}
        <img
          ref={imgRef}
          src={videoUrl || ""}
          alt="camera frame"
          style={{ width: "100%", display: videoUrl && !imageError ? "block" : "none" }}
          onLoad={() => { setImageLoaded(true); setImageError(false); }}
          onError={() => { setImageError(true); setImageLoaded(false); }}
        />

        <canvas
          ref={canvasRef}
          className="drawing-canvas"
          onClick={handleCanvasClick}
          onContextMenu={handleRightClick}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height:"100%",
            background: "transparent",
            cursor: isDrawing ? "crosshair" : "default",
          }}
        />
      </div>

      <div className="canvas-controls">
        <button
          className={`btn ${isDrawing ? "btn-stop" : "btn-start"}`}
          onClick={() => setIsDrawing((v) => !v)}
        >
          {isDrawing ? "⏹ Stop Drawing" : "✏️ Start Drawing"}
        </button>

        <button className="btn btn-secondary" onClick={undoLastPoint}>
          ↶ Undo Point
        </button>

        <button className="btn btn-secondary" onClick={undoLastPolygon}>
          ↶ Undo Polygon
        </button>

        <button className="btn btn-danger" onClick={resetCanvas}>
          🗑 Reset All
        </button>
      </div>

      <div style={{
        marginTop: "12px",
        fontFamily: "monospace",
        fontSize: "13px",
        background: "var(--card-bg)",
        border: "1px solid var(--border)",
        borderRadius: "6px",
        padding: "10px 14px",
        color: "var(--text)",
        maxHeight: "180px",
        overflowY: "auto",
      }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "6px", color: "var(--muted)", fontSize: "11px", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          <span>Polygons: <strong style={{ color: "#7dd3fc" }}>{polygons.length}</strong></span>
          <span>In progress: <strong style={{ color: "#fbbf24" }}>{points.length} pts</strong></span>
        </div>

        {/* Current in-progress points */}
        {points.length > 0 && (
          <div style={{ marginBottom: "6px" }}>
            <span style={{ color: "#fbbf24", fontWeight: "bold" }}>● Drawing: </span>
            {points.map((p, i) => (
              <span key={i} style={{ marginRight: "8px", color: "#fde68a" }}>
                ({p[0]}, {p[1]})
              </span>
            ))}
          </div>
        )}

        {/* Completed polygons */}
        {polygons.map((poly, pi) => (
          <div key={pi} style={{ marginBottom: "4px" }}>
            <span style={{ color: "#86efac", fontWeight: "bold" }}>▣ Polygon {pi + 1}: </span>
            {poly.map((p, i) => (
              <span key={i} style={{ marginRight: "8px", color: "#bbf7d0" }}>
                ({p[0]}, {p[1]})
              </span>
            ))}
          </div>
        ))}

        {points.length === 0 && polygons.length === 0 && (
          <span style={{ color: "#555" }}>No points yet — click Start Drawing and left-click on the frame.</span>
        )}
      </div>
    </div>
  );
};

export default PointDrawingCanvas;