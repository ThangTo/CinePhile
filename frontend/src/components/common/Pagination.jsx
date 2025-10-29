import React from "react";

const Pagination = ({ page, totalPages, onPrev, onNext }) => {
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
            bg-white/5
            border border-white/10
            backdrop-blur
            shadow-sm
            hover:bg-white/15 hover:scale-105
            transition-all duration-200
            text-white
            ${page === 1 ? "opacity-30 cursor-not-allowed" : ""}
        `}
        >
        <span className="text-lg">←</span>
      </button>

      <div className="flex items-center gap-2 bg-gray-800/80 backdrop-blur px-5 py-2.5 rounded-3xl border border-white/10 shadow-sm">
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
            bg-white/5
            border border-white/10
            backdrop-blur
            shadow-sm
            hover:bg-white/15 hover:scale-105
            transition-all duration-200
            text-white
            ${page === totalPages ? "opacity-30 cursor-not-allowed" : ""}
        `}
        >
        <span className="text-lg">→</span>
      </button>
    </div>
  );
};

export default Pagination;
