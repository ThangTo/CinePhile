import React, { useEffect, useRef } from "react";
import Hls from "hls.js";

const VideoPlayer = ({ src, poster }) => {
  const videoRef = useRef(null);
  const hlsRef = useRef(null);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    // Nếu src rỗng thì không làm gì
    if (!src) return;

    // Hủy HLS instance cũ nếu có
    if (hlsRef.current) {
      hlsRef.current.destroy();
    }

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
      });
      
      hls.loadSource(src);
      hls.attachMedia(video);
      hlsRef.current = hls;

    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Hỗ trợ Safari
      video.src = src;
    }

    // Cleanup khi component unmount
    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy();
      }
    };
  }, [src]);

  return (
    <div className="relative w-full aspect-video bg-black rounded-xl overflow-hidden shadow-2xl border border-gray-800 group">
      {src ? (
        <video
          ref={videoRef}
          controls
          className="w-full h-full object-contain"
          poster={poster}
          playsInline
        />
      ) : (
        <div className="flex flex-col items-center justify-center w-full h-full text-gray-500 bg-[#0f0f0f]">
          <p className="text-lg font-medium">Chọn tập phim để bắt đầu xem</p>
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;