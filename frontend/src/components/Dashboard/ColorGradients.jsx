import React from "react";

const ColorGradients = () => {
  return (
    <svg width="0" height="0">
      <defs>
        <linearGradient id="gradColor1" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop
            offset="0%"
            style={{
              stopColor: "rgba(94, 55, 255, 0.85)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset="100%"
            style={{
              stopColor: "rgba(106, 210, 255, 0.85)",
              stopOpacity: 1,
            }}
          />
        </linearGradient>
        <linearGradient id="gradColor2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop
            offset="0%"
            style={{
              stopColor: "rgba(106, 210, 255, 0.85)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset="100%"
            style={{
              stopColor: "rgba(225, 233, 248, 0.85)",
              stopOpacity: 1,
            }}
          />
        </linearGradient>
        <linearGradient id="gradColor3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop
            offset="0%"
            style={{
              stopColor: "rgba(225, 233, 248, 0.85)",
              stopOpacity: 1,
            }}
          />
          <stop
            offset="100%"
            style={{
              stopColor: "rgba(94, 55, 255, 0.85)",
              stopOpacity: 1,
            }}
          />
        </linearGradient>
      </defs>
    </svg>
  );
};

export default ColorGradients;
