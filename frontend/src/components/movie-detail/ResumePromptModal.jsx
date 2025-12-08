import React from "react";
import { createPortal } from "react-dom";
import { useNavigate } from "react-router-dom";

const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return "00:00";
  const hours = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  return `${hours.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
    .toString()
    .padStart(2, "0")}`;
};

const ResumePromptModal = ({ isOpen, onClose, savedProgress, movie, audioType }) => {
  const navigate = useNavigate();

  if (!isOpen || !savedProgress) return null;

  const handleResume = () => {
    const movieId = movie?.id || movie?._id;
    if (!movieId) return;

    const episode = savedProgress.episodeId || {};
    const episodeNumber = episode.episodeId || episode.episode || 1;
    const savedAudioType = episode.audioType || audioType;
    const audioQuery = savedAudioType ? `&audio=${encodeURIComponent(savedAudioType)}` : "";

    navigate(`/watch/${movieId}?ep=${episodeNumber}${audioQuery}`, {
      state: { resumeTime: savedProgress.watchTime },
    });
    onClose();
  };

  const handleStartFromBeginning = () => {
    const movieId = movie?.id || movie?._id;
    if (!movieId) return;

    const episode = savedProgress.episodeId || {};
    const episodeNumber = episode.episodeId || episode.episode || 1;
    const savedAudioType = episode.audioType || audioType;
    const audioQuery = savedAudioType ? `&audio=${encodeURIComponent(savedAudioType)}` : "";

    navigate(`/watch/${movieId}?ep=${episodeNumber}${audioQuery}`);
    onClose();
  };

  const handleSkip = () => {
    onClose();
  };

  // Lấy thông tin episode
  const episode = savedProgress.episodeId || {};
  const episodeNumber = episode.episodeId || episode.episode || null;
  const hasEpisode = episodeNumber !== null;

  const modalContent = (
    <div className="fixed inset-0 flex items-center justify-center z-[9999] p-4">
      {/* Backdrop with blur and darken effect */}
      <div
        className="absolute inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
        onClick={handleSkip}
      />

      {/* Main Modal Card */}
      <div className="relative bg-[#1a1a1a] w-full max-w-md rounded-2xl shadow-2xl border border-white/10 overflow-hidden transform transition-all scale-100 animate-in fade-in zoom-in duration-200">
        {/* Decorative Top Gradient Line */}
        <div className="h-1 w-full bg-gradient-to-r from-transparent via-primaryColor to-transparent opacity-70" />

        {/* Close Button (Absolute Top Right) */}
        <button
          onClick={handleSkip}
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
          <div className="w-16 h-16 rounded-full bg-primaryColor/10 flex items-center justify-center mb-5 text-primaryColor">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              width="32"
              height="32"
              viewBox="0 0 24 24"
              fill="currentColor"
              stroke="none"
            >
              <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-1 14H9V8h2v8zm4 0h-2V8h2v8z" />
            </svg>
          </div>

          <h3 className="text-xl font-bold text-white mb-2">Tiếp tục xem?</h3>

          <div className="text-gray-400 mb-8 space-y-1">
            <p className="text-sm">Bạn đang xem dở phim tại:</p>

            {/* Time Display with Monospace font */}
            <div className="flex flex-col items-center justify-center gap-2 py-2">
              {hasEpisode && (
                <span className="px-2 py-1 rounded bg-white/10 border border-white/5 text-xs font-medium text-gray-300">
                  Tập {episodeNumber}
                </span>
              )}
              <span className="text-2xl md:text-3xl font-mono font-bold text-primaryColor tracking-wider drop-shadow-lg">
                {formatTime(savedProgress.watchTime)}
              </span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="w-full space-y-3">
            {/* Primary Action: Resume */}
            <button
              onClick={handleResume}
              className="group w-full py-3.5 px-6 bg-primaryColor hover:bg-hoverPrimaryColor text-black font-bold rounded-xl transition-all shadow-lg shadow-primaryColor/20 hover:shadow-primaryColor/40 flex items-center justify-center gap-2"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 24 24"
                fill="currentColor"
                className="group-hover:scale-110 transition-transform"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
              <span>Xem tiếp</span>
            </button>

            {/* Secondary Action: Start Over */}
            <button
              onClick={handleStartFromBeginning}
              className="w-full py-3 px-6 bg-transparent border border-white/10 hover:border-white/30 text-gray-300 hover:text-white rounded-xl transition-colors flex items-center justify-center gap-2 text-sm font-medium"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="16"
                height="16"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                <path d="M3 3v5h5" />
              </svg>
              Xem lại từ đầu
            </button>
          </div>

          {/* Tertiary Action: Skip/Cancel (Link style) */}
          <button
            onClick={handleSkip}
            className="mt-6 text-xs text-gray-500 hover:text-gray-300 transition-colors underline decoration-gray-700 underline-offset-4"
          >
            Không, cảm ơn (Đóng)
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default ResumePromptModal;
