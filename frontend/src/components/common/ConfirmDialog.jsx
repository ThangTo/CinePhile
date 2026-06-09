import React from "react";
import { createPortal } from "react-dom";

/**
 * ConfirmDialog - Modal xác nhận dùng chung
 * * @param {boolean} isOpen - Trạng thái hiển thị
 * @param {function} onClose - Hàm đóng modal (Hủy)
 * @param {function} onConfirm - Hàm thực thi hành động (Đồng ý)
 * @param {string} title - Tiêu đề (Mặc định: Xác nhận)
 * @param {string} message - Nội dung thông báo
 * @param {string} confirmText - Chữ trên nút xác nhận (Mặc định: Đồng ý)
 * @param {string} cancelText - Chữ trên nút hủy (Mặc định: Hủy bỏ)
 * @param {boolean} isDanger - Nếu true, giao diện sẽ chuyển sang màu đỏ (Dùng cho hành động Xóa/Logout)
 */
const ConfirmDialog = ({
  isOpen,
  onClose,
  onConfirm,
  title = "Xác nhận",
  message = "Bạn có chắc chắn muốn thực hiện hành động này?",
  confirmText = "Đồng ý",
  cancelText = "Hủy bỏ",
  isDanger = false,
}) => {
  if (!isOpen) return null;

  // Xử lý màu sắc dựa trên mức độ nguy hiểm (Danger Mode)

  // Icon hiển thị tùy ngữ cảnh
  const Icon = isDanger ? (
    // Warning Icon (Tam giác chấm than)
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z" />
      <path d="M12 9v4" />
      <path d="M12 17h.01" />
    </svg>
  ) : (
    // Info/Question Icon (Dấu hỏi)
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="32"
      height="32"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3" />
      <path d="M12 17h.01" />
    </svg>
  );

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] safe-modal-padding">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={onClose}
      />

      {/* Main Modal Card */}
      <div className="relative bg-[#1a1a1a] w-full max-w-sm rounded-2xl shadow-2xl border border-white/10 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Decorative Gradient Line (Dynamic Color) */}
        <div
          className={`h-1 w-full bg-gradient-to-r from-transparent via-${
            isDanger ? "red-600" : "primaryColor"
          } to-transparent opacity-70`}
        />

        {/* Close Button */}
        <button
          onClick={onClose}
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
          {/* Icon Circle */}
          <div
            className={`w-16 h-16 rounded-full flex items-center justify-center mb-5 
            ${isDanger ? "bg-red-500/10 text-red-500" : "bg-primaryColor/10 text-primaryColor"}`}
          >
            {Icon}
          </div>

          <h3 className="text-xl font-bold text-white mb-2">{title}</h3>

          <p className="text-gray-400 mb-8 text-sm leading-relaxed">{message}</p>

          {/* Action Buttons */}
          <div className="w-full flex gap-3">
            <button
              onClick={onClose}
              className="flex-1 py-3 px-4 bg-transparent border border-white/10 hover:bg-white/5 text-gray-300 hover:text-white rounded-xl transition-colors font-medium text-sm"
            >
              {cancelText}
            </button>

            <button
              onClick={onConfirm}
              className={`flex-1 py-3 px-4 text-black font-bold rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 text-sm
                ${
                  isDanger
                    ? "bg-red-600 hover:bg-red-700 text-white shadow-red-900/20"
                    : "bg-primaryColor hover:bg-hoverPrimaryColor text-black shadow-primaryColor/20"
                }`}
            >
              {confirmText}
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ConfirmDialog;
