import React from "react";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const ResumePrompt = ({ savedProgress, onResume, onStartFromBeginning }) => {
  if (!savedProgress) return null;

  return (
    <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-30">
      <div className="bg-black/90 rounded-lg p-6 md:p-8 max-w-md mx-4 text-center">
        <p className="text-white text-sm md:text-base mb-4">
          Tiếp tục xem từ {formatTime(savedProgress.watchTime)}?
        </p>
        <div className="flex gap-3 justify-center">
          <button
            onClick={onResume}
            className="px-4 py-2 bg-primaryColor hover:bg-hoverPrimaryColor text-white rounded-lg transition-colors font-medium"
          >
            Tiếp tục
          </button>
          <button
            onClick={onStartFromBeginning}
            className="px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-lg transition-colors font-medium"
          >
            Xem từ đầu
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResumePrompt;
