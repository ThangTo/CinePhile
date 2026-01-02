import React, { useState, useEffect } from "react";
import { FiChevronLeft, FiChevronRight } from "react-icons/fi";

/**
 * Pagination Component V2
 * Giao diện dựa trên pagination của NotificationsTab/CommentTable
 * Logic điền số để chuyển trang như Pagination.jsx
 *
 * @param {Object} props
 * @param {number} props.page - Trang hiện tại
 * @param {number} props.totalPages - Tổng số trang
 * @param {Function} props.onPageChange - Callback khi thay đổi trang
 * @param {string} props.className - CSS class tùy chỉnh
 */
const PaginationV2 = ({ page, totalPages, onPageChange, className }) => {
  const [inputVal, setInputVal] = useState(page);

  useEffect(() => {
    setInputVal(page);
  }, [page]);

  const handleInputChange = (e) => {
    setInputVal(e.target.value);
  };

  const handleCommit = () => {
    let newPage = parseInt(inputVal);

    if (isNaN(newPage) || newPage < 1) {
      newPage = 1;
    } else if (newPage > totalPages) {
      newPage = totalPages;
    }

    setInputVal(newPage);

    if (newPage !== page) {
      onPageChange(newPage);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter") {
      handleCommit();
      e.target.blur();
    }
  };

  // Tính toán các trang cần hiển thị
  const getVisiblePages = () => {
    const maxVisible = 5; // Số trang tối đa hiển thị
    const pages = [];

    if (totalPages <= maxVisible) {
      // Nếu tổng số trang <= 5, hiển thị tất cả
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      // Logic hiển thị thông minh
      if (page <= 3) {
        // Trang đầu: 1, 2, 3, 4, 5
        for (let i = 1; i <= 5; i++) {
          pages.push(i);
        }
      } else if (page >= totalPages - 2) {
        // Trang cuối: ... n-4, n-3, n-2, n-1, n
        for (let i = totalPages - 4; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        // Trang giữa: ... p-1, p, p+1, p+2, ...
        for (let i = page - 1; i <= page + 1; i++) {
          pages.push(i);
        }
      }
    }

    return pages;
  };

  const visiblePages = getVisiblePages();

  if (totalPages <= 1) {
    return null; // Không hiển thị nếu chỉ có 1 trang
  }

  return (
    <div className={`flex items-center justify-center gap-2 ${className || ""}`}>
      {/* Container với style giống NotificationsTab/CommentTable */}
      <div className="flex items-center bg-[#1a1a1a] p-1 rounded-xl border border-white/5 shadow-sm">
        {/* Nút Previous */}
        <button
          onClick={() => onPageChange(page - 1)}
          disabled={page === 1}
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg transition-all
            ${
              page === 1
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }
          `}
          aria-label="Trang trước"
          title="Trang trước"
        >
          <FiChevronLeft className="w-5 h-5" />
        </button>

        {/* Các nút số trang */}
        <div className="flex items-center px-2 gap-1">
          {/* Hiển thị trang đầu nếu cần */}
          {visiblePages[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"
              >
                1
              </button>
              {visiblePages[0] > 2 && <span className="text-gray-500 text-xs px-1">...</span>}
            </>
          )}

          {/* Các trang hiển thị */}
          {visiblePages.map((pageNum) => (
            <button
              key={pageNum}
              onClick={() => onPageChange(pageNum)}
              className={`
                w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all
                ${
                  page === pageNum
                    ? "bg-primaryColor text-black shadow-md transform scale-105"
                    : "text-gray-400 hover:bg-white/5 hover:text-white"
                }
              `}
            >
              {pageNum}
            </button>
          ))}

          {/* Hiển thị trang cuối nếu cần */}
          {visiblePages[visiblePages.length - 1] < totalPages && (
            <>
              {visiblePages[visiblePages.length - 1] < totalPages - 1 && (
                <span className="text-gray-500 text-xs px-1">...</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-xs font-bold transition-all text-gray-400 hover:bg-white/5 hover:text-white"
              >
                {totalPages}
              </button>
            </>
          )}
        </div>

        {/* Nút Next */}
        <button
          onClick={() => onPageChange(page + 1)}
          disabled={page === totalPages}
          className={`
            w-9 h-9 flex items-center justify-center rounded-lg transition-all
            ${
              page === totalPages
                ? "text-gray-600 cursor-not-allowed"
                : "text-gray-300 hover:bg-white/10 hover:text-white"
            }
          `}
          aria-label="Trang sau"
          title="Trang sau"
        >
          <FiChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Input nhập số trang */}
      <div className="flex items-center gap-2 bg-[#1a1a1a] backdrop-blur px-4 py-2 rounded-xl border border-white/5 shadow-sm">
        <span className="text-gray-300 text-sm whitespace-nowrap">Trang</span>
        <input
          type="number"
          value={inputVal}
          onChange={handleInputChange}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="w-12 bg-bgColor3 px-1 py-1 rounded-lg text-white text-sm text-center shadow-inner outline-none focus:ring-2 focus:ring-primaryColor/50 border border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          min="1"
          max={totalPages}
        />
        <span className="text-gray-300 text-sm whitespace-nowrap">/ {totalPages}</span>
      </div>
    </div>
  );
};

export default PaginationV2;
