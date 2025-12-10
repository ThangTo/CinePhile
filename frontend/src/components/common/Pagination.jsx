import React, { useState, useEffect } from "react";

const Pagination = ({ page, totalPages, onPageChange, className }) => {
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

  return (
    <div className="flex items-center justify-center gap-4 mt-8 text-white">
      {/* Nút Previous */}
      <button
        onClick={() => onPageChange(page - 1)}
        disabled={page === 1}
        aria-label="Trang trước"
        title="Trang trước"
        className={`
            h-10 w-10 flex items-center justify-center
            rounded-full
            bg-bgColor2
            border border-white/10
            backdrop-blur
            shadow-sm
            hover:bg-bgColor2/80 hover:scale-105
            transition-all duration-200
            text-white
            hover:text-primaryColor
            ${className}
            ${page === 1 ? "opacity-30 cursor-not-allowed" : ""}
        `}
      >
        <i className="fa-solid fa-chevron-left text-sm" />
      </button>

      {/* Phần hiển thị Input + Tổng số trang */}
      <div
        className={`flex items-center gap-2 bg-bgColor2 backdrop-blur px-5 py-2.5 rounded-3xl border border-white/10 shadow-sm ${className}`}
      >
        <span className="text-gray-300 text-sm whitespace-nowrap">Trang</span>

        {/* Input nhập số trang */}
        <input
          type="number"
          value={inputVal}
          onChange={handleInputChange}
          onBlur={handleCommit}
          onKeyDown={handleKeyDown}
          className="w-12 bg-gray-900 px-1 py-1 rounded-xl text-white text-sm text-center shadow-inner outline-none focus:ring-2 focus:ring-primaryColor/50 border border-transparent transition-all [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
        />

        <span className="text-gray-300 text-sm whitespace-nowrap">/ {totalPages}</span>
      </div>

      {/* Nút Next */}
      <button
        onClick={() => onPageChange(page + 1)}
        disabled={page === totalPages}
        aria-label="Trang sau"
        title="Trang sau"
        className={`
            h-10 w-10 flex items-center justify-center
            rounded-full
            bg-bgColor2
            border border-white/10
            backdrop-blur
            shadow-sm
            hover:bg-bgColor2/80 hover:scale-105
            transition-all duration-200
            text-white
            hover:text-primaryColor
            ${page === totalPages ? "opacity-30 cursor-not-allowed" : ""}
            ${className}
        `}
      >
        <i className="fa-solid fa-chevron-right text-sm" />
      </button>
    </div>
  );
};

export default Pagination;
