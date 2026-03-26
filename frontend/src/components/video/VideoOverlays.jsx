import React from "react";

const VideoOverlays = ({
  hasNativePlayer,
  isBuffering,
  isPlaying,
  movie,
  currentTime,
  onPlayPause,
}) => {
  return (
    <>
      {/* Background Poster Image */}
      {hasNativePlayer && !isPlaying && currentTime === 0 && movie?.backgroundImage && (
        <div className="absolute inset-0 z-[5] pointer-events-none">
          <img
            src={movie.backgroundImage}
            alt={movie.title}
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/40 to-black/60" />
        </div>
      )}

      {/* Buffering Indicator */}
      {hasNativePlayer && isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-10">
          <div className="flex flex-col items-center gap-3">
            <div className="animate-spin rounded-full h-14 w-14 border-t-4 border-b-4 border-white"></div>
          </div>
        </div>
      )}

      {/* Center Play Button Overlay */}
      {hasNativePlayer && !isPlaying && !isBuffering && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-black/30 cursor-pointer z-10"
          onClick={onPlayPause}
        >
          <button className="w-16 h-16 md:w-20 md:h-20 lg:w-24 lg:h-24 bg-white/90 opacity-30 hover:bg-white rounded-full flex items-center justify-center transition-all transform hover:scale-110 shadow-2xl pointer-events-none">
            <i className="fa-solid fa-play text-black text-xl md:text-2xl lg:text-4xl ml-0.5 md:ml-1 lg:ml-1.5" />
          </button>
        </div>
      )}
    </>
  );
};

export default VideoOverlays;
