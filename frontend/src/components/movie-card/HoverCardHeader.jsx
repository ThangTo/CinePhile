import React, { useState, useEffect, useRef } from "react";
import OptimizedImage from "components/common/OptimizedImage";
import YouTube from "react-youtube";
import { getHasUserInteracted, subscribeUserInteraction } from "utils/userInteraction";

// Helper function để extract YouTube video ID từ URL
const extractYouTubeId = (url) => {
  if (!url) return null;

  // Các pattern YouTube URL
  const patterns = [
    /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/v\/)([^&\n?#]+)/,
    /youtube\.com\/.*[?&]v=([^&\n?#]+)/,
  ];

  for (const pattern of patterns) {
    const match = url.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }

  return null;
};

// Helper function để tạo YouTube embed URL (cho phép bật/tắt tiếng)
const getYouTubeEmbedUrl = (videoId, withSound = false) => {
  if (!videoId) return null;
  // withSound = true -> mute=0, otherwise mute=1 để tránh bị chặn autoplay
  const mute = withSound ? 0 : 1;
  return `https://www.youtube.com/embed/${videoId}?modestbranding=1&controls=0&autoplay=1&mute=${mute}&loop=1&rel=0&playlist=${videoId}&start=5&iv_load_policy=3&cc_load_policy=0&disablekb=1&fs=0&vq=hd1080`;
};

/**
 * Hover Card Header Component - Backdrop image with title overlay
 * @param {Object} props
 * @param {string} props.backgroundImage - Backdrop image URL
 * @param {string} props.title - Movie title
 * @param {string} props.subtitle - Movie subtitle/English title
 * @param {string} props.trailerUrl - Trailer YouTube URL (optional)
 * @param {Function} props.onClick - Click handler (optional)
 * @param {boolean} props.useYouTubePlayer - Nếu true: dùng react-youtube (mặc định mute, bật/tắt tiếng từng card)
 */
const HoverCardHeader = ({
  backgroundImage,
  title,
  subtitle,
  trailerUrl,
  onClick,
  useYouTubePlayer = false,
}) => {
  const [showTrailer, setShowTrailer] = useState(false);
  const [hidePoster, setHidePoster] = useState(false);
  const [trailerReady, setTrailerReady] = useState(false);
  const [trailerError, setTrailerError] = useState(false);
  // withSound (chỉ dùng cho option iframe + interaction)
  const [withSound, setWithSound] = useState(getHasUserInteracted());
  // State cho option react-youtube: mặc định mute, bật/tắt tiếng từng card
  const [isMuted, setIsMuted] = useState(true);
  const trailerTimeoutRef = useRef(null);
  const loadTimeoutRef = useRef(null);
  const iframeRef = useRef(null);
  const ytPlayerRef = useRef(null);

  // Theo dõi thay đổi trạng thái user interaction toàn cục (đã click/keydown/touch ở bất kỳ đâu)
  // Chỉ áp dụng cho option iframe (option hiện tại)
  useEffect(() => {
    if (useYouTubePlayer) return;
    const unsubscribe = subscribeUserInteraction((val) => {
      if (val) setWithSound(true);
    });
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, [useYouTubePlayer]);

  // Hiển thị trailer khi component mount (hover card đã hiện)
  useEffect(() => {
    const youtubeId = extractYouTubeId(trailerUrl);

    // Reset states
    setTrailerError(false);
    setShowTrailer(false);
    setHidePoster(false);
    setTrailerReady(false);
    // Giữ nguyên withSound theo cờ global (không reset về false)
    setIsMuted(true);

    if (youtubeId) {
      trailerTimeoutRef.current = setTimeout(() => {
        // Bắt đầu load trailer ngay (nhưng vẫn ẩn)
        setShowTrailer(true);
        // Không fade out poster ngay, đợi iframe load xong

        // Timeout: nếu video không load được sau 8 giây, fallback về poster
        loadTimeoutRef.current = setTimeout(() => {
          setTrailerError(true);
          setShowTrailer(false);
          setHidePoster(false);
          setTrailerReady(false);
        }, 8000);
      }, 500); // delay ban đầu
    }

    // Copy ref values for cleanup
    const trailerTimeout = trailerTimeoutRef.current;
    const loadTimeout = loadTimeoutRef.current;

    return () => {
      if (trailerTimeout) {
        clearTimeout(trailerTimeout);
      }
      if (loadTimeout) {
        clearTimeout(loadTimeout);
      }
      setShowTrailer(false);
      setHidePoster(false);
      setTrailerReady(false);
      setTrailerError(false);
      setIsMuted(true);
    };
  }, [trailerUrl]);

  // Handler khi iframe load xong
  const handleIframeLoad = () => {
    // Clear timeout nếu video đã load
    if (loadTimeoutRef.current) {
      clearTimeout(loadTimeoutRef.current);
      loadTimeoutRef.current = null;
    }

    // Iframe đã load, đợi thêm để video thực sự ready (tránh loading spinner)
    if (showTrailer && !trailerReady && !trailerError) {
      // Đợi 1.5 giây để video YouTube thực sự ready và không còn loading spinner
      setTimeout(() => {
        if (!trailerError) {
          setTrailerReady(true);
          setHidePoster(true);
        }
      }, 1500);
    }
  };

  const youtubeId = extractYouTubeId(trailerUrl);
  const youtubeEmbedUrl =
    !useYouTubePlayer && youtubeId && !trailerError
      ? getYouTubeEmbedUrl(youtubeId, withSound)
      : null;

  // Chỉ hiển thị trailer nếu có URL hợp lệ và không có lỗi
  const hasValidTrailer = !!youtubeId && !trailerError;
  const shouldShowTrailer = hasValidTrailer && showTrailer && !trailerError;

  return (
    <div
      className="relative h-[225px] w-full overflow-hidden cursor-pointer hover:brightness-110 transition-all"
      onClick={onClick}
    >
      {/* Poster Image với transition - fade out trong lúc video load */}
      {/* Nếu không có trailer hoặc có lỗi, poster luôn hiển thị */}
      <OptimizedImage
        src={backgroundImage}
        alt={title}
        className={`h-full w-full object-cover transition-opacity duration-1000 ${
          shouldShowTrailer && hidePoster ? "opacity-0" : "opacity-100"
        } ${shouldShowTrailer ? "pointer-events-none" : ""}`}
        lazy={false}
        priority={true}
        sizeKey="DETAIL"
      />

      {/* YouTube Trailer Overlay - load ngay sau 1 giây, fade in khi đã load xong */}
      {/* Chỉ hiển thị nếu có URL hợp lệ và không có lỗi */}
      {shouldShowTrailer && (
        <div
          className={`absolute inset-0 w-full h-full overflow-hidden transition-opacity duration-1000 ${
            trailerReady ? "opacity-100" : "opacity-0"
          }`}
          style={{
            visibility: shouldShowTrailer ? "visible" : "hidden",
          }}
        >
          {/* Overlay che loading spinner cho đến khi video ready */}
          {!trailerReady && <div className="absolute inset-0 bg-black z-10" />}
          <div
            className="absolute inset-0 w-full h-full"
            style={{
              transform: "scale(1.6)",
              transformOrigin: "center center",
            }}
          >
            {/* Option 1 (mặc định): dùng iframe + interaction global */}
            {!useYouTubePlayer && youtubeEmbedUrl && (
              <iframe
                ref={iframeRef}
                src={youtubeEmbedUrl}
                className="absolute inset-0 w-full h-full"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title={`Trailer ${title}`}
                onLoad={handleIframeLoad}
                style={{
                  objectFit: "cover",
                  imageRendering: "high-quality",
                  WebkitImageRendering: "high-quality",
                }}
              />
            )}

            {/* Option 2: dùng react-youtube, mặc định mute, bật/tắt tiếng từng card */}
            {useYouTubePlayer && youtubeId && (
              <YouTube
                videoId={youtubeId}
                className="absolute inset-0 w-full h-full"
                iframeClassName="absolute inset-0 w-full h-full"
                opts={{
                  width: "100%",
                  height: "100%",
                  playerVars: {
                    autoplay: 1,
                    controls: 0,
                    modestbranding: 1,
                    rel: 0,
                    loop: 1,
                    playlist: youtubeId,
                    mute: 1, // luôn mute lúc autoplay
                    start: 0,
                    iv_load_policy: 3,
                    cc_load_policy: 0,
                    disablekb: 1,
                    fs: 0,
                    playsinline: 1,
                  },
                }}
                onReady={(event) => {
                  ytPlayerRef.current = event.target;
                  // Đảm bảo mute + autoplay
                  try {
                    event.target.mute();
                    event.target.playVideo();
                  } catch (e) {
                    // ignore
                  }
                  if (!trailerReady) {
                    setTrailerReady(true);
                    setHidePoster(true);
                  }
                }}
              />
            )}
          </div>

          {/* Nút bật/tắt tiếng cho option react-youtube (mặc định mute, không dùng interaction global) */}
          {useYouTubePlayer && trailerReady && (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                if (!ytPlayerRef.current) return;
                try {
                  if (isMuted) {
                    ytPlayerRef.current.unMute();
                  } else {
                    ytPlayerRef.current.mute();
                  }
                  setIsMuted(!isMuted);
                } catch (err) {
                  // ignore
                }
              }}
              className="absolute bottom-3 right-3 z-20 px-3 py-1.5 rounded-full bg-black/70 text-white text-xs font-semibold border border-white/20 hover:bg-black/80 transition"
            >
              {isMuted ? "Bật tiếng" : "Tắt tiếng"}
            </button>
          )}
        </div>
      )}

      {/* Gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-t from-gray-800 via-gray-700/10 to-transparent" />

      {/* Title overlay on image - ẩn khi video đang phát */}
      <div
        className={`absolute inset-x-0 bottom-0 px-4 pb-3 transition-opacity duration-1000 ${
          shouldShowTrailer && hidePoster ? "opacity-0" : "opacity-100"
        }`}
      >
        <h3 className="text-xl font-bold text-white mb-1 drop-shadow-lg line-clamp-2">{title}</h3>
        {subtitle && <p className="text-sm text-primaryColor font-semibold">{subtitle}</p>}
      </div>
    </div>
  );
};

export default HoverCardHeader;
