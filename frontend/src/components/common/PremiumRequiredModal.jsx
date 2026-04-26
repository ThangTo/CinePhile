import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

const PremiumRequiredModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  if (!isOpen) return null;

  const handleUpgrade = () => {
    navigate("/premium"); // Redirect to upgrade page
    onClose();
  };

  const handleClose = () => {
    onClose();
  };

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
      {/* Backdrop with blur and darken effect */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleClose}
      />

      {/* Main Modal Card */}
      <div className="relative bg-[#1a1a1a] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Decorative Top Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-yellow-500 to-transparent opacity-70" />

        {/* Close Button (Absolute Top Right) */}
        <button
          onClick={handleClose}
          className="absolute top-3 right-3 p-2 text-gray-400 hover:text-white transition-colors rounded-full hover:bg-white/10"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="20"
            height="20"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M18 6 6 18" />
            <path d="m6 6 12 12" />
          </svg>
        </button>

        <div className="p-8 flex flex-col items-center text-center">
          {/* Icon Header */}
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 flex items-center justify-center mb-5 text-yellow-500">
            <i className="fa-solid fa-crown text-3xl"></i>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Tính năng Premium</h3>

          <div className="text-gray-400 mb-8 space-y-1">
            <p className="text-sm">
              Tính năng này chỉ dành cho thành viên Premium. <br />
              Vui lòng nâng cấp tài khoản để trải nghiệm nhiều tính năng hấp dẫn!
            </p>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {/* Primary Action: Upgrade */}
            <button
              onClick={handleUpgrade}
              className="group w-full py-3.5 px-6 bg-gradient-to-r from-yellow-600 to-yellow-500 hover:from-yellow-500 hover:to-yellow-400 text-black font-bold rounded-xl transition-all shadow-lg shadow-yellow-500/20 hover:shadow-yellow-500/40 flex items-center justify-center gap-2"
            >
              <i className="fa-solid fa-gem group-hover:scale-110 transition-transform"></i>
              <span>Nâng cấp ngay</span>
            </button>

            {/* Secondary Action: Close */}
            <button
              onClick={handleClose}
              className="w-full py-3 px-6 bg-transparent border border-white/10 hover:border-white/30 text-gray-300 hover:text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              Đóng
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default PremiumRequiredModal;
