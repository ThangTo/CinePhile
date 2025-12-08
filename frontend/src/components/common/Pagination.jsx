import React from "react";

const Pagination = ({ page, totalPages, onPrev, onNext, className }) => {
  return (
    <div className="flex items-center justify-center gap-4 mt-8 text-white">
      <button
        onClick={onPrev}
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
        <i className="fa-solid fa-chevron-left text-sm " />
      </button>

      <div
        className={`flex items-center gap-2 bg-bgColor2 backdrop-blur px-5 py-2.5 rounded-3xl border border-white/10 shadow-sm ${className}`}
      >
        <span className="text-gray-300 text-sm">Trang</span>
        <span className="font-semibold bg-gray-900 px-2.5 py-1 rounded-xl text-white text-sm shadow-inner">
          {page}
        </span>
        <span className="text-gray-300 text-sm">/ {totalPages}</span>
      </div>

      <button
        onClick={onNext}
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
        <i className="fa-solid fa-chevron-right text-sm " />
      </button>
    </div>
  );
};

export default Pagination;
