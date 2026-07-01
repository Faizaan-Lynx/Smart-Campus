import React, { createContext, useContext, useEffect, useRef, useState } from "react";
import { toast, ToastContainer } from "react-toastify";

export const AlertContext = createContext();

export const useAlert = () => useContext(AlertContext);

export const AlertProvider = ({ children }) => {
  const [alerts, setAlerts] = useState([]);
  const audioRef = useRef(null);
  const intervalRef = useRef(null);
  const [openToasts, setOpenToasts] = useState(0);
  const [activeToastIds, setActiveToastIds] = useState([]);
  const [totalAlerts, setTotalAlerts] = useState(0); // Track total alerts for sound
  const MAX_TOASTS = 2;

  // Function to manage toast limits
  const manageToastLimit = () => {
    if (activeToastIds.length >= MAX_TOASTS) {
      // Remove the oldest toast (first in the array)
      const oldestToastId = activeToastIds[0];
      toast.dismiss(oldestToastId);
      setActiveToastIds(prev => prev.slice(1));
      // Don't decrement openToasts here - we want to keep the sound going
    }
  };

  // Function to add a new toast
  const addToast = (message, options = {}) => {
    // Check if we need to remove the oldest toast
    manageToastLimit();
    
    // Create the new toast
    const toastId = toast(message, {
      autoClose: false,
      closeOnClick: false,
      position: "top-right",
      style: {
        background: "var(--card-bg)",
        color: "var(--text)",
        cursor: "pointer",
        maxHeight: '80vh',
        overflowY: 'auto',
      },
      ...options
    });
    
    // Add the new toast ID to our tracking array
    setActiveToastIds(prev => [...prev, toastId]);
    setTotalAlerts(prev => prev + 1); // Increment total alerts for sound tracking
    
    return toastId;
  };

  // Function to remove a toast from tracking
  const removeToastFromTracking = (toastId) => {
    setActiveToastIds(prev => prev.filter(id => id !== toastId));
    setOpenToasts(prev => Math.max(0, prev - 1));
  };

  // Function to manually dismiss all toasts and stop sound
  const dismissAllToasts = () => {
    toast.dismiss(); // Dismiss all toasts
    setActiveToastIds([]);
    setOpenToasts(0);
    setTotalAlerts(0); // Reset total alerts to stop sound
  };

  // Camera fetching is now handled in Dashboard component

  // Note: WebSocket connections and alert fetching are now handled in Dashboard component
  // This context only provides the toast management functionality

  // Play sound when there are active toasts
  useEffect(() => {
    // Helper to play the sound
    const playSound = () => {
      if (audioRef.current) {
        audioRef.current.currentTime = 0;
        audioRef.current.play();
      }
    };
    
    // Helper to stop the sound immediately
    const stopSound = () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
      }
    };
    
    // If there are alerts, start interval
    if (totalAlerts > 0) {
      if (!intervalRef.current) {
        playSound();
        intervalRef.current = setInterval(playSound, 2000);
      }
    } else {
      // No alerts, stop sound immediately
      stopSound();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    }
    // Cleanup on unmount
    return () => {
      stopSound();
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [totalAlerts]);

  // Periodically clean up stale toast IDs
  useEffect(() => {
    const cleanupInterval = setInterval(() => {
      // Get all active toast IDs from react-toastify
      const allToastIds = toast.getToastIds();
      
      // Remove any IDs from our tracking that are no longer active
      setActiveToastIds(prev => prev.filter(id => allToastIds.includes(id)));
    }, 5000); // Check every 5 seconds

    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <AlertContext.Provider value={{ alerts, setAlerts, addToast, dismissAllToasts }}>
      <audio ref={audioRef} src="/alert.mp3" preload="auto" />
      <ToastContainer
        theme="light"
        position="top-right"
        className="toast-container"
        toastClassName="toast-message"
        autoClose={false}
        closeOnClick={false}
        draggable={false}
        style={{ maxHeight: '80vh', overflowY: 'auto' }}
        onOpen={() => setOpenToasts((count) => count + 1)}
        onClose={(toastId) => {
          setOpenToasts((count) => Math.max(0, count - 1));
          // If user manually closes a toast, decrement total alerts
          setTotalAlerts((count) => Math.max(0, count - 1));
        }}
      />
      {children}
    </AlertContext.Provider>
  );
}; 