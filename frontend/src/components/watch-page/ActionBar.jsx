import React, { useState } from "react";

const ActionBar = () => {
  const [autoPlay, setAutoPlay] = useState(true);
  const [skipIntro, setSkipIntro] = useState(false);
  const [cinemaMode, setCinemaMode] = useState(false);

  return (
    <div className="bg-gray-800/90 backdrop-blur-sm border-b border-white/10">
      <div className="container mx-auto px-4 py-3">
        <div className="flex items-center justify-between">
          {/* Left Actions */}
          <div className="flex items-center gap-6">
            <button className="action-btn">
              <i className="fa-solid fa-heart" />
              <span className="text-sm">Yêu thích</span>
            </button>

            <button className="action-btn">
              <i className="fa-solid fa-plus" />
              <span className="text-sm">Thêm vào</span>
            </button>

            {/* Auto Play Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Chuyển tập</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoPlay}
                  onChange={(e) => setAutoPlay(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                <span className="ml-2 text-sm text-gray-300">{autoPlay ? "ON" : "OFF"}</span>
              </label>
            </div>

            {/* Skip Intro Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Bỏ qua giới thiệu</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={skipIntro}
                  onChange={(e) => setSkipIntro(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                <span className="ml-2 text-sm text-gray-300">{skipIntro ? "ON" : "OFF"}</span>
              </label>
            </div>

            {/* Cinema Mode Toggle */}
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-300">Rạp phim</span>
              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={cinemaMode}
                  onChange={(e) => setCinemaMode(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-gray-600 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-yellow-500"></div>
                <span className="ml-2 text-sm text-gray-300">{cinemaMode ? "ON" : "OFF"}</span>
              </label>
            </div>
          </div>

          {/* Right Actions */}
          <div className="flex items-center gap-6">
            <button className="action-btn">
              <i className="fa-solid fa-broadcast-tower" />
              <span className="text-sm">Xem chung</span>
            </button>

            <button className="action-btn">
              <i className="fa-solid fa-paper-plane" />
              <span className="text-sm">Chia sẻ</span>
            </button>

            <button className="action-btn">
              <i className="fa-solid fa-flag" />
              <span className="text-sm">Báo lỗi</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ActionBar;
