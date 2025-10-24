import React, { useEffect } from "react";
import "../../styles/Toast.css";

const Toast = ({ message, type = "success", duration = 2000, onClose }) => {
  useEffect(() => {
    // Show toast with animation
    const timer = setTimeout(() => {
      onClose();
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  const icons = {
    success: "fa-check-circle",
    error: "fa-exclamation-circle",
    warning: "fa-exclamation-triangle",
    info: "fa-info-circle",
  };

  return (
    <div className={`toast toast-${type} toast-show`}>
      <i className={`fas ${icons[type]} toast-icon`}></i>
      <span className="toast-message">{message}</span>
    </div>
  );
};

export default Toast;
