import React, { useState, useEffect, useRef } from "react";
import "./splashscreen.css";

const AnimatedSplash = ({ children, imageSrc }) => {
  const [showSplash, setShowSplash] = useState(true);
  const splashRef = useRef(null);

  useEffect(() => {
    // Duration of the pop animation (1.5s)
    const popDuration = 1500; // in ms
    // Duration of the fade-out animation (0.5s)
    const fadeDuration = 500; // in ms
    const totalDuration = popDuration + fadeDuration; // 2000ms = 2s

    // Start fade-out after pop animation finishes
    const popTimer = setTimeout(() => {
      if (splashRef.current) {
        splashRef.current.style.animationPlayState = "running";
      }
    }, popDuration);

    // Remove splash screen after totalDuration
    const removeTimer = setTimeout(() => {
      setShowSplash(false);
    }, totalDuration);

    return () => {
      clearTimeout(popTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  return (
    <>
      {showSplash && (
        <div className="splash-container" ref={splashRef}>
          <img src={imageSrc} alt="Splash" className="splash-image" />
        </div>
      )}
      {!showSplash && children}
    </>
  );
};

export default AnimatedSplash;
