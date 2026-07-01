import React, { createContext, useEffect, useState } from "react";

export const ThemeContext = createContext();

export const ThemeProvider = ({ children }) => {
  const [theme, setTheme] = useState(() => {
    try {
      return localStorage.getItem("theme") || "dark";
    } catch (e) {
      return "dark";
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("theme", theme);
    } catch (e) {}

    const root = document.documentElement;
    if (theme === "light") {
      root.classList.add("light");
    } else {
      root.classList.remove("light");
    }
    // Update inline styles (MUI sx and React inline style) to theme variables.
    // Save original inline values to data attributes so dark mode is restored exactly.
    try {
      const rootStyle = getComputedStyle(document.documentElement);
      const textVar = "var(--text)";
      const cardVar = "var(--card-bg)";
      const mutedVar = "var(--muted)";
      const borderVar = "var(--border)";

      const nodes = document.querySelectorAll("[style]");
      nodes.forEach((el) => {
        try {
          const s = el.style;

          // color -> use --text
          if (s.color) {
            if (theme === "light") {
              if (!el.dataset.origColor) el.dataset.origColor = s.color;
              s.color = textVar;
            } else {
              if (el.dataset.origColor) {
                s.color = el.dataset.origColor;
                delete el.dataset.origColor;
              }
            }
          }

          // backgroundColor -> use --card-bg
          if (s.backgroundColor) {
            if (theme === "light") {
              if (!el.dataset.origBg) el.dataset.origBg = s.backgroundColor;
              s.backgroundColor = cardVar;
            } else {
              if (el.dataset.origBg) {
                s.backgroundColor = el.dataset.origBg;
                delete el.dataset.origBg;
              }
            }
          }

          // borderColor -> use --border
          if (s.borderColor) {
            if (theme === "light") {
              if (!el.dataset.origBorder) el.dataset.origBorder = s.borderColor;
              s.borderColor = borderVar;
            } else {
              if (el.dataset.origBorder) {
                s.borderColor = el.dataset.origBorder;
                delete el.dataset.origBorder;
              }
            }
          }

          // boxShadow often encodes color; replace common dark shadow with lighter transparent shadow in light mode
          if (s.boxShadow) {
            if (theme === "light") {
              if (!el.dataset.origBoxShadow) el.dataset.origBoxShadow = s.boxShadow;
              s.boxShadow = "0 1px 6px rgba(16,24,40,0.06)";
            } else {
              if (el.dataset.origBoxShadow) {
                s.boxShadow = el.dataset.origBoxShadow;
                delete el.dataset.origBoxShadow;
              }
            }
          }
        } catch (e) {
          // ignore per-element errors
        }
      });
    } catch (e) {
      // ignore theme DOM update errors
    }
  }, [theme]);

  const toggle = () => setTheme((t) => (t === "light" ? "dark" : "light"));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
};

export default ThemeProvider;
