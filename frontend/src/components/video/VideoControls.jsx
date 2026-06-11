import React from "react";
import Tooltip from "../watch-page/Tooltip";
import ProgressBar from "./ProgressBar";
import QualityMenu from "./QualityMenu";
import SpeedMenu from "./SpeedMenu";
import AudioMenu from "./AudioMenu";
import SubtitleMenu from "./SubtitleMenu";
import MobileMoreMenu from "./MobileMoreMenu";
import { formatTime } from "utils/ultils";

const VideoControls = ({
  showControls,
  isBuffering,
  hasNativePlayer,
  // Progress Bar
  currentTime,
  duration,
  bufferedPercentage,
  onSeek,
  videoRef,
  onDragStateChange,
  // Play/Pause
  isPlaying,
  onPlayPause,
  // Skip
  onSkip,
  // Volume
  volume,
  maxVolume = 1,
  isMuted,
  onVolumeChange,
  onToggleMute,
  // Next Episode
  episode,
  totalEpisodes,
  onNextEpisode,
  // Audio
  audioOptions,
  audioType,
  currentAudioLabel,
  showAudioMenu,
  onToggleAudioMenu,
  onAudioChange,
  // Speed
  playbackRate,
  showSpeedMenu,
  onToggleSpeedMenu,
  onSpeedChange,
  // Quality
  quality,
  qualityOptions,
  showQualityMenu,
  onToggleQualityMenu,
  onQualityChange,
  isPremium,
  isQualityPremium,
  // Fullscreen
  isFullscreen,
  onToggleFullscreen,
  // Picture in Picture
  allowPictureInPicture = false,
  onPictureInPicture,
  // Mobile More Menu
  showMoreMenu,
  onToggleMoreMenu,
  setShowMoreMenu,
  // Download
  onDownload,
  // Download Progress (Minimal UI)
  isDownloading,
  downloadProgress,
  isDownloadMinimized,
  onToggleDownloadMinimize,
  // Subtitle
  showSubtitleMenu,
  onToggleSubtitleMenu,
  subtitleOptions,
  currentSubtitle,
  onSubtitleChange,
  isGeneratingSubtitle,
  subtitleProgress,
}) => {
  if ((!showControls && !isBuffering) || !hasNativePlayer) {
    return null;
  }

  return (
    <div
      className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black via-black/50 to-transparent p-2 md:p-3 lg:p-4 pt-12 md:pt-16 lg:pt-20 transition-opacity duration-300 z-20 pointer-events-none opacity-100 touch-auto"
      style={{
        bottom: 0,
        paddingBottom: isFullscreen ? "calc(0.5rem + var(--safe-bottom))" : "0.5rem",
        transform: "translate3d(0, 0, 0)",
      }}
    >
      {/* Progress Bar */}
      <ProgressBar
        currentTime={currentTime}
        duration={duration}
        bufferedPercentage={bufferedPercentage}
        onSeek={onSeek}
        videoRef={videoRef}
        episode={episode}
        onDragStateChange={onDragStateChange}
      />

      {/* Control Buttons */}
      <div className="flex items-center justify-between gap-2 md:gap-3 pointer-events-auto touch-auto">
        <div className="flex items-center gap-2 md:gap-3">
          {/* Play/Pause */}
          <Tooltip text={isPlaying ? "Tạm dừng (k)" : "Phát (k)"}>
            <button
              onClick={onPlayPause}
              className="w-8 h-8 md:w-10 md:h-10 lg:w-12 lg:h-12 bg-white hover:bg-white/90 rounded-full flex items-center justify-center transition-all transform hover:scale-105 shadow-lg"
            >
              <i
                className={`fa-solid ${
                  isPlaying ? "fa-pause" : "fa-play"
                } text-black text-xs md:text-sm lg:text-lg ${!isPlaying && "ml-0.5"}`}
              />
            </button>
          </Tooltip>

          {/* Skip Buttons */}
          <Tooltip text="Tua lại 10 giây">
            <button
              onClick={() => onSkip(-10)}
              className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
            >
              <div className="relative">
                <i className="fa-solid fa-rotate-left text-white text-xs md:text-sm lg:text-base" />
                {/* <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] lg:text-[10px] text-white font-bold">
                  10
                </span> */}
              </div>
            </button>
          </Tooltip>

          <Tooltip text="Tua tới 10 giây">
            <button
              onClick={() => onSkip(10)}
              className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
            >
              <div className="relative">
                <i className="fa-solid fa-rotate-right text-white text-xs md:text-sm lg:text-base" />
                {/* <span className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 text-[8px] md:text-[9px] lg:text-[10px] text-white font-bold">
                  10
                </span> */}
              </div>
            </button>
          </Tooltip>

          {/* Volume */}
          <div className="hidden md:flex items-center gap-1 md:gap-2 group/volume">
            <Tooltip text={isMuted ? "Bật tiếng" : "Tắt tiếng"}>
              <button onClick={onToggleMute} className="hover:scale-110 transition-transform">
                <i
                  className={`fa-solid ${
                    isMuted || volume === 0
                      ? "fa-volume-xmark"
                      : volume < 0.5
                        ? "fa-volume-low"
                        : "fa-volume-high"
                  } text-white text-sm md:text-base lg:text-xl`}
                />
              </button>
            </Tooltip>
            <div className="relative w-0 hidden group-hover/volume:block group-hover/volume:w-16 md:group-hover/volume:w-20 lg:group-hover/volume:w-24 h-1 md:h-1.5 transition-all duration-300">
              <div className="absolute inset-0 bg-white/30 rounded-lg" />
              <div
                className="absolute inset-y-0 left-0 bg-white rounded-lg"
                style={{
                  width: `${Math.min(100, ((isMuted ? 0 : volume) / maxVolume) * 100)}%`,
                }}
              />
              <input
                type="range"
                min="0"
                max={maxVolume}
                step="0.01"
                value={isMuted ? 0 : volume}
                onChange={onVolumeChange}
                className="absolute inset-0 w-full h-full appearance-none bg-transparent cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-2.5 [&::-webkit-slider-thumb]:h-2.5 md:[&::-webkit-slider-thumb]:w-3 md:[&::-webkit-slider-thumb]:h-3 lg:[&::-webkit-slider-thumb]:w-3.5 lg:[&::-webkit-slider-thumb]:h-3.5 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white [&::-webkit-slider-thumb]:shadow-md [&::-moz-range-thumb]:w-2.5 [&::-moz-range-thumb]:h-2.5 md:[&::-moz-range-thumb]:w-3 md:[&::-moz-range-thumb]:h-3 lg:[&::-moz-range-thumb]:w-3.5 lg:[&::-moz-range-thumb]:h-3.5 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-white [&::-moz-range-thumb]:border-0"
              />
            </div>
          </div>

          <div className="flex md:hidden text-[10px] text-white mt-1 font-medium">
            <span>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>
        </div>

        {/* Center Controls (Minimized Download Progress) */}
        {isDownloading && isDownloadMinimized && (
          <Tooltip text="Mở rộng thông tin tải">
            <div 
              onClick={onToggleDownloadMinimize}
              className="hidden lg:flex items-center gap-3 bg-white/10 px-4 py-1.5 rounded-full cursor-pointer hover:bg-white/20 transition-all border border-white/5 mx-2 min-w-[200px]"
            >
              <i className="fa-solid fa-cloud-arrow-down text-primaryColor animate-bounce text-sm" style={{ animationDuration: '1.5s' }}></i>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-[10px] text-white/70 font-medium">Đang tải...</span>
                  <span className="text-[10px] text-white font-bold">{downloadProgress}%</span>
                </div>
                <div className="w-full bg-white/20 rounded-full h-1 overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-primaryColor to-primaryColor/70 h-1 rounded-full transition-all duration-300"
                    style={{ width: `${downloadProgress}%` }}
                  />
                </div>
              </div>
            </div>
          </Tooltip>
        )}

        <div className="flex items-center gap-1 md:gap-2">
          {/* Next Episode - Desktop/Tablet */}
          {(() => {
            const currentEpNumber = episode?.episode || episode?.episodeId || 1;
            return currentEpNumber < totalEpisodes ? (
              <>
                <div className="hidden md:block">
                  <Tooltip text={`Xem tập ${currentEpNumber + 1}`}>
                    <button
                      onClick={onNextEpisode}
                      className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                    >
                      <i className="fa-solid fa-forward-step text-white text-sm lg:text-base" />
                    </button>
                  </Tooltip>
                </div>
                <div className="md:hidden">
                  <Tooltip text={`Tập ${currentEpNumber + 1}`}>
                    <button
                      onClick={onNextEpisode}
                      className="w-7 h-7 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                    >
                      <i className="fa-solid fa-forward-step text-white text-xs" />
                    </button>
                  </Tooltip>
                </div>
              </>
            ) : null;
          })()}

          {/* Audio Selection - Desktop/Tablet only */}
          {audioOptions.length > 0 && (
            <div className="hidden md:flex">
              <AudioMenu
                audioOptions={audioOptions}
                audioType={audioType}
                currentAudioLabel={currentAudioLabel}
                showAudioMenu={showAudioMenu}
                onToggleAudioMenu={onToggleAudioMenu}
                onAudioChange={onAudioChange}
              />
            </div>
          )}

          {/* Subtitle Menu - Desktop only */}
          <div className="hidden md:flex">
            <SubtitleMenu
              subtitleOptions={subtitleOptions}
              currentSubtitle={currentSubtitle}
              showSubtitleMenu={showSubtitleMenu}
              onToggleSubtitleMenu={onToggleSubtitleMenu}
              onSubtitleChange={onSubtitleChange}
              isGenerating={isGeneratingSubtitle}
              generatingProgress={subtitleProgress}
            />
          </div>

          {/* Picture in Picture - Desktop/Tablet only */}
          {allowPictureInPicture && (
          <div className="hidden md:block">
            <Tooltip text="Thu nhỏ">
              <button
                onClick={onPictureInPicture}
                className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
              >
                <i className="fa-solid fa-images text-white text-sm lg:text-base" />
              </button>
            </Tooltip>
          </div>
          )}

          {/* Speed Menu - Desktop/Tablet only */}
          <div className="hidden md:flex">
            <SpeedMenu
              playbackRate={playbackRate}
              showSpeedMenu={showSpeedMenu}
              onToggleSpeedMenu={onToggleSpeedMenu}
              onSpeedChange={onSpeedChange}
            />
          </div>

          {/* Quality - Desktop/Tablet only */}
          <div className="hidden md:flex">
            <QualityMenu
              quality={quality}
              qualityOptions={qualityOptions}
              showQualityMenu={showQualityMenu}
              onToggleQualityMenu={onToggleQualityMenu}
              onQualityChange={onQualityChange}
              isPremium={isPremium}
              isQualityPremium={isQualityPremium}
            />
          </div>

          {/* Download Button */}
          {onDownload && (
            <div className="hidden md:block">
              <Tooltip text="Tải phim gốc">
                <button
                  onClick={onDownload}
                  className="w-8 h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
                >
                  <i className="fa-solid fa-download text-white text-sm lg:text-base" />
                </button>
              </Tooltip>
            </div>
          )}

          {/* Fullscreen - Always visible */}
          <Tooltip text={isFullscreen ? "Thoát toàn màn hình (f)" : "Toàn màn hình (f)"}>
            <button
              onClick={onToggleFullscreen}
              className="w-7 h-7 md:w-8 md:h-8 lg:w-10 lg:h-10 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-full flex items-center justify-center transition-all hover:scale-105"
            >
              <i
                className={`fa-solid ${
                  isFullscreen ? "fa-compress" : "fa-expand"
                } text-white text-xs md:text-sm lg:text-base`}
              />
            </button>
          </Tooltip>

          {/* More Menu (3 dots) - Mobile only */}
          <div className="md:hidden">
            <MobileMoreMenu
              audioOptions={audioOptions}
              audioType={audioType}
              currentAudioLabel={currentAudioLabel}
              showAudioMenu={showAudioMenu}
              onToggleAudioMenu={onToggleAudioMenu}
              onAudioChange={onAudioChange}
              allowPictureInPicture={allowPictureInPicture}
              onPictureInPicture={onPictureInPicture}
              playbackRate={playbackRate}
              showSpeedMenu={showSpeedMenu}
              onToggleSpeedMenu={onToggleSpeedMenu}
              onSpeedChange={onSpeedChange}
              quality={quality}
              qualityOptions={qualityOptions}
              showQualityMenu={showQualityMenu}
              onToggleQualityMenu={onToggleQualityMenu}
              onQualityChange={onQualityChange}
              isPremium={isPremium}
              isQualityPremium={isQualityPremium}
              showMoreMenu={showMoreMenu}
              onToggleMoreMenu={onToggleMoreMenu}
              setShowMoreMenu={setShowMoreMenu}
              onDownload={onDownload}
              // Subtitle
              showSubtitleMenu={showSubtitleMenu}
              onToggleSubtitleMenu={onToggleSubtitleMenu}
              subtitleOptions={subtitleOptions}
              currentSubtitle={currentSubtitle}
              onSubtitleChange={onSubtitleChange}
              isGeneratingSubtitle={isGeneratingSubtitle}
              subtitleProgress={subtitleProgress}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default VideoControls;
