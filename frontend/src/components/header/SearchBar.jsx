import React from "react";

const SearchBar = ({ className = "", placeholder = "Tìm kiếm phim, diễn viên..." }) => {
  return (
    <div className={`relative ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        className="w-full bg-[#0b1220] text-gray-200 placeholder:text-gray-400 rounded-full pl-11 pr-4 py-2 border border-white/10 focus:outline-none focus:ring-2 focus:ring-cyan-500/60 focus:border-transparent"
      />
      <svg
        className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth="2"
          d="M21 21l-4.35-4.35m0 0A7.5 7.5 0 1010.5 18.5a7.5 7.5 0 006.15-3.85z"
        />
      </svg>
    </div>
  );
};

export default SearchBar;
