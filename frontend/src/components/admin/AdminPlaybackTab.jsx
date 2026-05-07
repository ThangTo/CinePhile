import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import PaginationV2 from "components/common/PaginationV2";
import { getVideoSource } from "config/video.config";
import { playbackAPI } from "services/admin.service";

const STATUS_OPTIONS = [
  { value: "all", label: "Tất cả" },
  { value: "none", label: "Chưa có" },
  { value: "detected", label: "Đã detect" },
  { value: "needs_review", label: "Cần duyệt" },
  { value: "approved", label: "Đã duyệt" },
  { value: "no_match", label: "Không match" },
  { value: "failed", label: "Lỗi" },
];

function toInputValue(value) {
  return value === null || value === undefined ? "" : String(value);
}

function parseSeconds(value) {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : null;
}

export function getIntroPreviewRange(draft = {}) {
  const startSec = parseSeconds(draft.introStartSec);
  const endSec = parseSeconds(draft.introEndSec);

  if (startSec === null || endSec === null || endSec <= startSec) return null;
  return { startSec, endSec };
}

export function buildAdminPreviewSource(rawM3u8, apiBaseUrl = process.env.REACT_APP_API_URL || "http://localhost:5000/api/v1") {
  const proxyEndpoint = `${apiBaseUrl}/movies/proxy-m3u8`;
  const source = getVideoSource(rawM3u8, proxyEndpoint);
  if (!source) return null;

  if (!source.startsWith(proxyEndpoint)) {
    return source;
  }

  try {
    const previewUrl = new URL(source);
    previewUrl.searchParams.set("mode", "direct");
    return previewUrl.toString();
  } catch {
    const separator = source.includes("?") ? "&" : "?";
    return `${source}${separator}mode=direct`;
  }
}

function getInitialDraft(episode) {
  const meta = episode?.playbackMeta || {};
  return {
    introStartSec: toInputValue(meta.introStartSec),
    introEndSec: toInputValue(meta.introEndSec),
    outroStartSec: toInputValue(meta.outroStartSec),
    confidence: toInputValue(meta.confidence ?? 0),
    applyToSeason: false,
  };
}

function formatJobState(job) {
  if (!job) return "";
  const state = job.state || "waiting";
  const progress = Number.isFinite(Number(job.progress)) ? Number(job.progress) : 0;
  const step = job.step ? ` - ${job.step}` : "";
  return `${state} ${Math.round(progress)}%${step}`;
}

function formatJobResult(job) {
  const result = job?.result;
  if (!result) return "";

  const sampled = Number(result.sampledEpisodes) || 0;
  const detected = Number(result.detectedEpisodes) || 0;
  const inferred = Number(result.inferredEpisodes) || 0;
  const noMatch = Number(result.noMatchEpisodes) || 0;

  if (detected === 0 && inferred === 0) {
    return `Không tìm thấy intro chung trong ${sampled} tập mẫu. Đã đánh dấu ${noMatch} tập là no_match để admin biết cần chỉnh tay hoặc chạy lại với cấu hình khác.`;
  }

  return `Đã ghi ${detected} tập detect, suy luận ${inferred} tập còn lại.`;
}

function formatTime(seconds) {
  const total = Math.max(0, Math.round(Number(seconds) || 0));
  const minutes = Math.floor(total / 60);
  const rest = total % 60;
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

const PreviewModal = ({ preview, saving, onClose, onApprove, onNeedsReview }) => {
  const videoRef = useRef(null);

  useEffect(() => {
    if (!preview?.source) return undefined;

    const video = videoRef.current;
    if (!video) return undefined;

    let hls = null;
    let closed = false;

    const seekAndPlay = () => {
      if (closed) return;
      video.currentTime = preview.startSec;
      video.play().catch(() => {});
    };

    const stopAtEnd = () => {
      if (video.currentTime >= preview.endSec) {
        video.pause();
        video.currentTime = preview.endSec;
      }
    };

    video.addEventListener("loadedmetadata", seekAndPlay);
    video.addEventListener("timeupdate", stopAtEnd);

    if (preview.source.includes(".m3u8") && Hls.isSupported()) {
      hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.loadSource(preview.source);
      hls.attachMedia(video);
      hls.on(Hls.Events.MANIFEST_PARSED, seekAndPlay);
    } else {
      video.src = preview.source;
    }

    return () => {
      closed = true;
      video.pause();
      video.removeEventListener("loadedmetadata", seekAndPlay);
      video.removeEventListener("timeupdate", stopAtEnd);
      video.removeAttribute("src");
      video.load();
      if (hls) hls.destroy();
    };
  }, [preview]);

  if (!preview) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-4xl overflow-hidden rounded-xl border border-white/10 bg-[#121212] shadow-2xl animate-fade-in-up">
        <div className="flex items-center justify-between border-b border-white/10 bg-white/5 px-6 py-4">
          <div>
            <h2 className="text-xl font-bold text-white">Xem thử Intro</h2>
            <div className="mt-1 text-sm font-medium text-gray-400">
              <span className="text-primaryColor">{preview.title}</span> - Tập {preview.episodeLabel} -{" "}
              <span className="text-white">{formatTime(preview.startSec)}</span> đến <span className="text-white">{formatTime(preview.endSec)}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20 hover:text-red-400"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        <div className="p-6">
          <div className="overflow-hidden rounded-lg border border-white/5 bg-black shadow-inner">
            <video
              ref={videoRef}
              controls
              className="aspect-video w-full"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-white/5 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-10 rounded-lg px-5 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Đóng
          </button>
          <button
            type="button"
            onClick={onNeedsReview}
            disabled={saving}
            className="h-10 rounded-lg bg-orange-500/20 px-5 text-sm font-semibold text-orange-400 transition-colors hover:bg-orange-500/30 disabled:opacity-50"
          >
            Đánh dấu Cần duyệt
          </button>
          <button
            type="button"
            onClick={onApprove}
            disabled={saving}
            className="h-10 rounded-lg bg-primaryColor px-6 text-sm font-semibold text-black shadow-lg transition-colors hover:bg-primaryColor/90 disabled:opacity-50"
          >
            <i className="fa-solid fa-check mr-2"></i>Phê duyệt
          </button>
        </div>
      </div>
    </div>
  );
};

const DETECT_MODE_OPTIONS = [
  { value: "sample", label: "Nhanh", icon: "fa-bolt" },
  { value: "remaining", label: "Chưa có", icon: "fa-filter" },
  { value: "all", label: "Tất cả", icon: "fa-layer-group" },
  { value: "specific", label: "Chỉ định", icon: "fa-list-ol" },
];

const DETECT_SAMPLE_SECONDS_OPTIONS = [
  { value: 300, label: "5 phút" },
  { value: 420, label: "7 phút" },
  { value: 600, label: "10 phút" },
  { value: 900, label: "15 phút" },
];

const DetectOptionsModal = ({ config, saving, onClose, onChange, onSubmit }) => {
  if (!config) return null;

  const showSampleSize = config.mode === "sample" || config.mode === "remaining";
  const canSubmit = config.mode !== "specific" || String(config.episodeNumbers || "").trim().length > 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-xl overflow-hidden rounded-2xl border border-white/10 bg-[#121212] shadow-2xl animate-fade-in-up">

        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 bg-gradient-to-r from-primaryColor/10 to-transparent px-6 py-5">
          <div className="flex items-center gap-4">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primaryColor/20 text-primaryColor">
              <i className="fa-solid fa-wand-magic-sparkles text-lg"></i>
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Nhận diện Intro tự động</h2>
              <p className="mt-0.5 text-sm font-medium text-gray-400">
                Phim: <span className="text-primaryColor">{config.episode?.movie?.name || "Chưa có tên"}</span>
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-red-500/20 hover:text-red-400"
          >
            <i className="fa-solid fa-xmark"></i>
          </button>
        </div>

        {/* Content */}
        <div className="space-y-6 p-6">

          {/* Detect Mode */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-300">
              Chọn chế độ nhận diện:
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DETECT_MODE_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`Chọn chế độ ${option.value}`}
                  onClick={() => onChange({ mode: option.value })}
                  className={`flex flex-col items-center justify-center gap-2 rounded-xl border p-3 transition-all duration-200 ${
                    config.mode === option.value
                      ? "border-primaryColor bg-primaryColor/10 text-primaryColor shadow-[0_0_15px_rgba(253,224,71,0.15)]"
                      : "border-white/5 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  <i className={`fa-solid ${option.icon} text-lg`}></i>
                  <span className="text-xs font-bold uppercase tracking-wider">{option.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Sample Duration */}
          <div>
            <label className="mb-3 block text-sm font-semibold text-gray-300">
              Thời lượng đầu phim dùng để phân tích:
            </label>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {DETECT_SAMPLE_SECONDS_OPTIONS.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  aria-label={`Chọn thời gian detect ${option.value} giây`}
                  onClick={() => onChange({ sampleSeconds: option.value })}
                  className={`flex h-12 items-center justify-center rounded-xl border px-3 text-sm font-bold transition-all duration-200 ${
                    Number(config.sampleSeconds) === option.value
                      ? "border-primaryColor bg-primaryColor/10 text-primaryColor shadow-[0_0_15px_rgba(253,224,71,0.15)]"
                      : "border-white/5 bg-white/5 text-gray-400 hover:border-white/20 hover:bg-white/10 hover:text-white"
                  }`}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          {/* Dynamic Inputs */}
          <div className="min-h-[80px] rounded-xl border border-white/5 bg-black/40 p-4">
            {showSampleSize && (
              <div className="animate-fade-in">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-300">
                    Số lượng tập dùng để lấy mẫu phân tích:
                  </span>
                  <div className="relative">
                    <input
                      type="number"
                      min="2"
                      max="500"
                      value={config.sampleSize}
                      onChange={(event) => onChange({ sampleSize: event.target.value })}
                      aria-label="Số tập detect"
                      className="h-12 w-full rounded-lg border border-white/10 bg-black/60 pl-12 pr-4 text-white placeholder-gray-500 outline-none transition-colors focus:border-primaryColor focus:bg-black focus:ring-1 focus:ring-primaryColor/50"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                      <i className="fa-solid fa-layer-group"></i>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Nên để từ 3-5 tập để AI có đủ dữ liệu so sánh chính xác âm thanh Intro chung.</p>
                </label>
              </div>
            )}

            {config.mode === "specific" && (
              <div className="animate-fade-in">
                <label className="block">
                  <span className="mb-2 block text-sm font-semibold text-gray-300">
                    Danh sách tập cần nhận diện:
                  </span>
                  <div className="relative">
                    <input
                      value={config.episodeNumbers}
                      onChange={(event) => onChange({ episodeNumbers: event.target.value })}
                      placeholder="VD: 6, 7, 8 hoặc 6-10"
                      aria-label="Danh sách tập detect"
                      className="h-12 w-full rounded-lg border border-white/10 bg-black/60 pl-12 pr-4 text-white placeholder-gray-600 outline-none transition-colors focus:border-primaryColor focus:bg-black focus:ring-1 focus:ring-primaryColor/50"
                    />
                    <div className="absolute inset-y-0 left-0 flex items-center pl-4 pointer-events-none text-gray-400">
                      <i className="fa-solid fa-list-ol"></i>
                    </div>
                  </div>
                  <p className="mt-2 text-xs text-gray-500">Nhập các tập cách nhau bằng dấu phẩy (VD: 1, 2, 3) hoặc khoảng (VD: 1-5).</p>
                </label>
              </div>
            )}

            {config.mode === "all" && (
              <div className="flex h-full items-center gap-3 text-sm text-gray-400 animate-fade-in">
                <i className="fa-solid fa-circle-info text-blue-400 text-lg"></i>
                <p>Hệ thống sẽ quét toàn bộ các tập hiện có của bộ phim này để tìm kiếm đoạn nhạc Intro.</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 border-t border-white/10 bg-black/40 px-6 py-4">
          <button
            type="button"
            onClick={onClose}
            className="h-11 rounded-lg px-6 text-sm font-semibold text-gray-300 transition-colors hover:bg-white/10 hover:text-white"
          >
            Hủy bỏ
          </button>
          <button
            type="button"
            onClick={onSubmit}
            aria-label="Bắt đầu detect intro"
            disabled={saving || !canSubmit}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-primaryColor px-8 text-sm font-bold text-black shadow-[0_4px_15px_rgba(253,224,71,0.3)] transition-all hover:bg-primaryColor/90 active:scale-95 disabled:opacity-50 disabled:shadow-none"
          >
            {saving ? (
              <i className="fa-solid fa-circle-notch fa-spin text-lg"></i>
            ) : (
              <i className="fa-solid fa-play"></i>
            )}
            {saving ? "Đang xử lý..." : "Tiến hành quét"}
          </button>
        </div>
      </div>
    </div>
  );
};

const getStatusColor = (status) => {
  switch (status) {
    case "approved":
      return "text-emerald-400 bg-emerald-400/10 border-emerald-400/20";
    case "needs_review":
      return "text-orange-400 bg-orange-400/10 border-orange-400/20";
    case "detected":
      return "text-blue-400 bg-blue-400/10 border-blue-400/20";
    case "no_match":
      return "text-gray-400 bg-gray-400/10 border-gray-400/20";
    case "failed":
      return "text-red-400 bg-red-400/10 border-red-400/20";
    default:
      return "text-gray-500 bg-white/5 border-white/10";
  }
};

const getBatchStateColor = (state) => {
  switch (state) {
    case "completed":
      return "border-emerald-400/20 bg-emerald-400/10 text-emerald-300";
    case "completed_with_errors":
      return "border-yellow-400/20 bg-yellow-400/10 text-yellow-300";
    case "running":
      return "border-blue-400/20 bg-blue-400/10 text-blue-300";
    case "failed":
      return "border-red-400/20 bg-red-400/10 text-red-300";
    case "skipped":
      return "border-gray-400/20 bg-gray-400/10 text-gray-300";
    default:
      return "border-white/10 bg-white/5 text-gray-300";
  }
};

const getBatchResultColor = (resultType) => {
  switch (resultType) {
    case "detected":
      return "text-emerald-300";
    case "no_match":
      return "text-gray-300";
    case "failed":
      return "text-red-300";
    case "completed":
      return "text-blue-300";
    default:
      return "text-gray-400";
  }
};

const formatBatchDateTime = (value) => {
  if (!value) return "Chưa có";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Không hợp lệ";

  return date.toLocaleString("vi-VN", {
    hour12: false,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

const formatBatchDuration = (durationMs) => {
  const seconds = Math.max(0, Math.round((Number(durationMs) || 0) / 1000));
  if (!seconds) return "0s";
  const minutes = Math.floor(seconds / 60);
  const remainSeconds = seconds % 60;
  if (!minutes) return `${remainSeconds}s`;
  return `${minutes}m ${remainSeconds}s`;
};

const getPriorityLabel = (prioritySource) => {
  switch (prioritySource) {
    case "recent_views":
      return "User xem hôm trước";
    case "banner":
      return "Banner";
    case "total_views":
      return "Lượt xem cao";
    case "backlog":
      return "Tồn đọng";
    default:
      return prioritySource || "Không rõ";
  }
};

const AdminPlaybackTab = () => {
  const [episodes, setEpisodes] = useState([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 25, total: 0, totalPages: 0 });
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [loading, setLoading] = useState(false);
  const [savingId, setSavingId] = useState(null);
  const [drafts, setDrafts] = useState({});
  const [error, setError] = useState("");
  const [activeJobId, setActiveJobId] = useState(null);
  const [activeJob, setActiveJob] = useState(null);
  const [preview, setPreview] = useState(null);
  const [detectConfig, setDetectConfig] = useState(null);
  const [latestBatch, setLatestBatch] = useState(null);
  const [batchLoading, setBatchLoading] = useState(false);
  const [batchError, setBatchError] = useState("");
  const refreshedJobIdRef = useRef(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
    }, 450);

    return () => clearTimeout(timeout);
  }, [search]);

  const loadEpisodes = useCallback(
    async (page = 1, options = {}) => {
      const effectiveSearch = options.searchOverride ?? debouncedSearch;
      setLoading(true);
      setError("");
      try {
        const result = await playbackAPI.getEpisodes({
          page,
          limit: pagination.limit,
          search: effectiveSearch || undefined,
          status,
        });
        const nextEpisodes = result.data || [];
        setEpisodes(nextEpisodes);
        setPagination(result.pagination || { page, limit: pagination.limit, total: 0, totalPages: 0 });
        setDrafts((prev) => {
          if (options.resetDrafts) {
            return nextEpisodes.reduce((next, episode) => {
              next[episode.id] = getInitialDraft(episode);
              return next;
            }, {});
          }

          const next = { ...prev };
          nextEpisodes.forEach((episode) => {
            if (!next[episode.id]) next[episode.id] = getInitialDraft(episode);
          });
          return next;
        });
      } catch (err) {
        setError(err.message || "Không tải được playback metadata");
      } finally {
        setLoading(false);
      }
    },
    [pagination.limit, debouncedSearch, status],
  );

  useEffect(() => {
    loadEpisodes(1);
  }, [loadEpisodes]);

  const loadLatestBatch = useCallback(async () => {
    setBatchLoading(true);
    setBatchError("");
    try {
      const result = await playbackAPI.getIntroBatchLatest();
      setLatestBatch(result.batch || null);
    } catch (err) {
      setBatchError(err.message || "Không tải được batch report");
    } finally {
      setBatchLoading(false);
    }
  }, []);

  useEffect(() => {
    loadLatestBatch();
  }, [loadLatestBatch]);

  useEffect(() => {
    if (!activeJobId) return undefined;

    const poll = async () => {
      try {
        const result = await playbackAPI.getDetectionStatus(activeJobId);
        const job = result.job || result;
        setActiveJob(job);
        if ((job.state === "completed" || job.state === "failed") && refreshedJobIdRef.current !== (job.id || activeJobId)) {
          refreshedJobIdRef.current = job.id || activeJobId;
          loadEpisodes(pagination.page, { resetDrafts: true });
          loadLatestBatch();
        }
      } catch (err) {
        setError(err.message || "Không kiểm tra được job detect intro");
      }
    };

    poll();
    const interval = setInterval(poll, 3000);
    return () => clearInterval(interval);
  }, [activeJobId, loadEpisodes, loadLatestBatch, pagination.page]);

  const jobDone = activeJob?.state === "completed" || activeJob?.state === "failed";
  const jobResultMessage = formatJobResult(activeJob);

  useEffect(() => {
    if (jobDone) {
      const timeout = setTimeout(() => {
        setActiveJobId(null);
        setActiveJob(null);
      }, 8000);
      return () => clearTimeout(timeout);
    }
    return undefined;
  }, [jobDone]);

  const stats = useMemo(() => {
    const approved = episodes.filter((item) => item.playbackMeta?.detectionStatus === "approved").length;
    const review = episodes.filter((item) => item.playbackMeta?.detectionStatus === "needs_review").length;
    const detected = episodes.filter((item) => item.playbackMeta?.detectionStatus === "detected").length;
    const noMatch = episodes.filter((item) => item.playbackMeta?.detectionStatus === "no_match").length;
    return { approved, review, detected, noMatch };
  }, [episodes]);

  const updateDraft = (episodeId, patch) => {
    setDrafts((prev) => ({
      ...prev,
      [episodeId]: {
        ...prev[episodeId],
        ...patch,
      },
    }));
  };

  const saveEpisode = async (episode, detectionStatus = "approved") => {
    const draft = drafts[episode.id] || getInitialDraft(episode);
    if ((detectionStatus === "approved" || detectionStatus === "needs_review") && !getIntroPreviewRange(draft)) {
      setError("Cần có intro start/end hợp lệ trước khi duyệt metadata");
      return;
    }

    setSavingId(episode.id);
    setError("");

    try {
      const result = await playbackAPI.updateEpisode(episode.id, {
        introStartSec: draft.introStartSec,
        introEndSec: draft.introEndSec,
        outroStartSec: draft.outroStartSec,
        detectionStatus,
        source: "manual",
        confidence: detectionStatus === "approved" ? 1 : draft.confidence,
        applyToSeason: draft.applyToSeason,
      });

      const updated = result.episode;
      if (draft.applyToSeason || Number(result.updatedCount) > 1) {
        await loadEpisodes(pagination.page, { resetDrafts: true });
      } else {
        setEpisodes((prev) => prev.map((item) => (item.id === updated.id ? updated : item)));
        setDrafts((prev) => ({
          ...prev,
          [updated.id]: getInitialDraft(updated),
        }));
      }
    } catch (err) {
      setError(err.message || "Không lưu được metadata");
    } finally {
      setSavingId(null);
    }
  };

  const openPreview = (episode) => {
    const draft = drafts[episode.id] || getInitialDraft(episode);
    const range = getIntroPreviewRange(draft);
    const source = buildAdminPreviewSource(episode.link_m3u8);

    if (!range) {
      setError("Cần có intro start/end hợp lệ để preview");
      return;
    }

    if (!source) {
      setError("Tập này không có link m3u8 để preview");
      return;
    }

    setError("");
    setPreview({
      episode,
      source,
      startSec: range.startSec,
      endSec: range.endSec,
      title: episode.movie?.name || "Untitled",
      episodeLabel: episode.episode,
    });
  };

  const savePreviewEpisode = async (detectionStatus) => {
    if (!preview?.episode) return;
    await saveEpisode(preview.episode, detectionStatus);
    setPreview(null);
  };

  const openDetectOptions = (episode) => {
    setError("");
    setDetectConfig({
      episode,
      mode: "sample",
      sampleSize: 5,
      sampleSeconds: 600,
      episodeNumbers: "",
    });
  };

  const updateDetectConfig = (patch) => {
    setDetectConfig((prev) => (prev ? { ...prev, ...patch } : prev));
  };

  const detectSeasonIntro = async (episode, detectOptions = {}) => {
    const movieId = episode.movie?.id;
    if (!movieId) return;

    const mode = detectOptions.mode || "sample";
    const sampleSize = Math.max(2, Math.min(500, Number.parseInt(detectOptions.sampleSize, 10) || 5));
    const sampleSeconds = Math.max(180, Math.min(900, Number.parseInt(detectOptions.sampleSeconds, 10) || 600));
    const payload = {
      movieId,
      sampleSeconds,
      episodeSelectionMode: mode,
      maxEpisodesPerJob: 500,
      applySeasonDefault: mode === "sample",
    };

    if (mode === "sample" || mode === "remaining") {
      payload.sampleSize = sampleSize;
    }

    if (mode === "specific") {
      payload.episodeNumbers = detectOptions.episodeNumbers;
    }

    setError("");
    try {
      const result = await playbackAPI.detectIntro(payload);
      refreshedJobIdRef.current = null;
      setActiveJobId(result.jobId);
      setActiveJob({
        id: result.jobId,
        state: result.state || "waiting",
        progress: 0,
        backend: result.backend,
        fallbackReason: result.fallbackReason,
      });
    } catch (err) {
      setError(err.message || "Không tạo được job detect intro");
    }
  };

  const submitDetectOptions = async () => {
    if (!detectConfig?.episode) return;
    await detectSeasonIntro(detectConfig.episode, detectConfig);
    setDetectConfig(null);
  };

  const latestBatchMovies = useMemo(
    () => (Array.isArray(latestBatch?.movies) ? latestBatch.movies.slice(0, 8) : []),
    [latestBatch],
  );

  return (
    <div className="animate-fade-in space-y-6">
      <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between rounded-xl bg-[#1a1a1a] p-6 border border-white/5 shadow-lg">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <i className="fa-solid fa-timeline text-primaryColor"></i>
            Quản lý Playback Metadata
          </h1>
          <p className="text-sm text-gray-400 mt-1 mb-3">Tự động hóa bỏ qua Intro/Outro dựa trên phân tích âm thanh</p>
          <div className="flex flex-wrap gap-3 text-xs font-medium">
            <div className="flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-emerald-400 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-emerald-500"></div>
              Đã duyệt: <span className="text-white">{stats.approved}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-orange-500/20 bg-orange-500/10 px-3 py-1.5 text-orange-400 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-orange-500 animate-pulse"></div>
              Cần duyệt: <span className="text-white">{stats.review}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-3 py-1.5 text-blue-400 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-blue-500"></div>
              Đã phát hiện: <span className="text-white">{stats.detected}</span>
            </div>
            <div className="flex items-center gap-2 rounded-full border border-gray-500/30 bg-gray-500/10 px-3 py-1.5 text-gray-400 shadow-sm">
              <div className="h-2 w-2 rounded-full bg-gray-500"></div>
              Không khớp: <span className="text-white">{stats.noMatch}</span>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-3 sm:flex-row w-full xl:w-auto">
          <div className="relative w-full sm:w-72">
            <div className="absolute inset-y-0 left-0 flex items-center pl-3 pointer-events-none">
              <i className="fa-solid fa-search text-gray-400"></i>
            </div>
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Tìm tên phim..."
              className="h-11 w-full rounded-lg border border-white/10 bg-black/50 pl-10 pr-4 text-sm text-white outline-none transition-colors focus:border-primaryColor focus:bg-white/5"
            />
          </div>
          <div className="relative">
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value)}
              className="h-11 appearance-none rounded-lg border border-white/10 bg-black/50 pl-4 pr-10 text-sm text-white outline-none transition-colors focus:border-primaryColor focus:bg-white/5"
            >
              {STATUS_OPTIONS.map((option) => (
                <option key={option.value} value={option.value} className="bg-[#1a1a1a]">
                  {option.label}
                </option>
              ))}
            </select>
            <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none">
              <i className="fa-solid fa-chevron-down text-gray-400 text-xs"></i>
            </div>
          </div>
          <button
            onClick={() => loadEpisodes(1, { searchOverride: search.trim() })}
            className="flex h-11 items-center justify-center gap-2 rounded-lg bg-white/10 px-5 text-sm font-semibold text-white transition-all hover:bg-white/20 active:scale-95"
          >
            <i className="fa-solid fa-rotate-right"></i> Tải lại
          </button>
        </div>
      </div>

      {activeJob && (
        <div className="overflow-hidden rounded-xl border border-primaryColor/30 bg-[#1a1a1a] shadow-lg animate-fade-in-up">
          <div className="bg-primaryColor/10 p-4 relative">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-primaryColor/0 via-primaryColor/5 to-primaryColor/0 animate-shimmer" style={{ backgroundSize: '200% 100%' }}></div>

            <div className="relative z-10 flex flex-col gap-2 md:flex-row md:items-center md:justify-between text-sm">
              <div className="flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primaryColor/20 flex items-center justify-center">
                  <i className="fa-solid fa-robot text-primaryColor"></i>
                </div>
                <div>
                  <h3 className="font-bold text-primaryColor">AI Detection Job Đang Chạy</h3>
                  <p className="text-white/70">
                    Trạng thái: <span className="text-white font-medium">{formatJobState(activeJob)}</span>
                    {activeJob.backend && <span className="ml-2 text-xs opacity-60">({activeJob.backend})</span>}
                  </p>
                </div>
              </div>
              {activeJob.failedReason && <div className="text-red-400 font-medium bg-red-400/10 px-3 py-1 rounded-md">{activeJob.failedReason}</div>}
            </div>

            {activeJob.fallbackReason && (
              <div className="relative z-10 mt-3 flex items-start gap-2 text-xs text-yellow-300 bg-yellow-400/10 p-2 rounded-lg">
                <i className="fa-solid fa-triangle-exclamation mt-0.5"></i>
                <span><strong className="block mb-0.5">Queue Fallback</strong> {activeJob.fallbackReason}</span>
              </div>
            )}

            {activeJob.message && (
              <div className="relative z-10 mt-3 text-xs text-gray-300 italic">
                <i className="fa-solid fa-info-circle mr-1.5 opacity-50"></i>{activeJob.message}
              </div>
            )}

            {jobResultMessage && (
              <div className="relative z-10 mt-3 text-xs text-emerald-400 font-medium bg-emerald-400/10 p-2 rounded-lg border border-emerald-400/20">
                <i className="fa-solid fa-check-circle mr-1.5"></i>{jobResultMessage}
              </div>
            )}

            <div className="relative z-10 mt-4 h-2 w-full overflow-hidden rounded-full bg-black/50 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-primaryColor/80 to-primaryColor transition-all duration-300 ease-out relative"
                style={{ width: `${Math.max(0, Math.min(100, Number(activeJob.progress) || 0))}%` }}
              >
                <div className="absolute inset-0 bg-white/20 animate-pulse"></div>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-[#1a1a1a] p-5 shadow-lg">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-300">
                <i className="fa-solid fa-clock-rotate-left"></i>
              </div>
              <div>
                <h2 className="text-lg font-bold text-white">Batch detect gần nhất</h2>
                <p className="text-xs text-gray-400">
                  {latestBatch
                    ? `${formatBatchDateTime(latestBatch.startedAt)} • ${latestBatch.trigger || "manual"}`
                    : "Chưa có dữ liệu batch"}
                </p>
              </div>
            </div>
            {batchError && <p className="mt-3 text-sm text-red-300">{batchError}</p>}
          </div>

          <button
            type="button"
            onClick={loadLatestBatch}
            disabled={batchLoading}
            className="flex h-10 items-center justify-center gap-2 rounded-lg bg-white/10 px-4 text-sm font-semibold text-white transition-all hover:bg-white/20 disabled:opacity-60"
          >
            <i className={`fa-solid fa-rotate-right ${batchLoading ? "fa-spin" : ""}`}></i>
            Cập nhật batch
          </button>
        </div>

        {latestBatch && (
          <div className="mt-5 space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
              <div className={`rounded-lg border px-4 py-3 ${getBatchStateColor(latestBatch.state)}`}>
                <p className="text-[11px] font-semibold uppercase tracking-wider opacity-80">Trạng thái</p>
                <p className="mt-1 text-sm font-bold uppercase">{latestBatch.state || "unknown"}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/30 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Tổng phim</p>
                <p className="mt-1 text-xl font-bold text-white">{latestBatch.totalMovies || 0}</p>
              </div>
              <div className="rounded-lg border border-emerald-400/10 bg-emerald-400/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-emerald-300/80">Detected</p>
                <p className="mt-1 text-xl font-bold text-emerald-300">{latestBatch.detectedMovies || 0}</p>
              </div>
              <div className="rounded-lg border border-gray-400/10 bg-gray-400/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">No match</p>
                <p className="mt-1 text-xl font-bold text-gray-200">{latestBatch.noMatchMovies || 0}</p>
              </div>
              <div className="rounded-lg border border-red-400/10 bg-red-400/5 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-red-300/80">Failed</p>
                <p className="mt-1 text-xl font-bold text-red-300">{latestBatch.failedMovies || 0}</p>
              </div>
              <div className="rounded-lg border border-white/5 bg-black/30 px-4 py-3">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-gray-500">Sample</p>
                <p className="mt-1 text-xl font-bold text-white">
                  {Math.round((Number(latestBatch.options?.sampleSeconds) || 0) / 60) || 0} phút
                </p>
              </div>
            </div>

            <div className="grid gap-3 text-xs text-gray-400 md:grid-cols-3">
              <div>
                <span className="text-gray-500">Kết thúc: </span>
                <span className="font-medium text-gray-200">{formatBatchDateTime(latestBatch.finishedAt)}</span>
              </div>
              <div>
                <span className="text-gray-500">Thời lượng: </span>
                <span className="font-medium text-gray-200">{formatBatchDuration(latestBatch.durationMs)}</span>
              </div>
              <div>
                <span className="text-gray-500">Ngày ưu tiên view: </span>
                <span className="font-medium text-gray-200">{latestBatch.viewWindow?.localDate || "Không rõ"}</span>
              </div>
            </div>

            {latestBatchMovies.length > 0 && (
              <div className="overflow-x-auto rounded-lg border border-white/5 bg-black/25">
                <div className="grid grid-cols-[minmax(180px,1fr)_120px_100px_100px_120px] gap-3 border-b border-white/5 px-4 py-3 text-[11px] font-semibold uppercase tracking-wider text-gray-500">
                  <span>Phim</span>
                  <span>Ưu tiên</span>
                  <span>Kết quả</span>
                  <span>Tập</span>
                  <span>Thời lượng</span>
                </div>
                {latestBatchMovies.map((movie) => (
                  <div
                    key={`${movie.movieId || movie.movieName}-${movie.priorityRank}`}
                    className="grid grid-cols-[minmax(180px,1fr)_120px_100px_100px_120px] gap-3 border-b border-white/5 px-4 py-3 text-sm last:border-b-0"
                  >
                    <span className="truncate font-semibold text-white" title={movie.movieName}>
                      {movie.priorityRank ? `${movie.priorityRank}. ` : ""}
                      {movie.movieName || "Không rõ tên"}
                    </span>
                    <span className="truncate text-gray-300">{getPriorityLabel(movie.prioritySource)}</span>
                    <span className={`font-semibold ${getBatchResultColor(movie.resultType)}`}>
                      {movie.resultType || movie.state || "pending"}
                    </span>
                    <span className="text-gray-300">
                      {(movie.detectedEpisodes || 0) + (movie.inferredEpisodes || 0)}/{movie.sampledEpisodes || 0}
                    </span>
                    <span className="text-gray-300">{formatBatchDuration(movie.durationMs)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {error && (
        <div className="flex items-center gap-3 rounded-lg border border-red-500/30 bg-red-500/10 px-5 py-4 text-sm text-red-200 animate-fade-in shadow-lg">
          <i className="fa-solid fa-circle-exclamation text-lg text-red-400"></i>
          {error}
        </div>
      )}

      <div className="rounded-xl border border-white/5 bg-[#1a1a1a] shadow-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-xs font-semibold uppercase tracking-wider text-gray-400">
              <tr>
                <th className="px-6 py-4 whitespace-nowrap">Thông tin Phim</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Tập</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Intro (Giây)</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Outro (Giây)</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Trạng thái AI</th>
                <th className="px-6 py-4 whitespace-nowrap text-center">Tùy chọn</th>
                <th className="px-6 py-4 whitespace-nowrap text-right">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-400 gap-3">
                      <i className="fa-solid fa-circle-notch fa-spin text-3xl text-primaryColor"></i>
                      <span className="font-medium">Đang tải dữ liệu...</span>
                    </div>
                  </td>
                </tr>
              ) : episodes.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-16 text-center">
                    <div className="flex flex-col items-center justify-center text-gray-500 gap-3">
                      <i className="fa-regular fa-folder-open text-4xl mb-2 opacity-50"></i>
                      <span className="font-medium">Chưa có tập phim nào phù hợp với bộ lọc</span>
                    </div>
                  </td>
                </tr>
              ) : (
                episodes.map((episode) => {
                  const draft = drafts[episode.id] || getInitialDraft(episode);
                  const meta = episode.playbackMeta || {};
                  const statusColorClass = getStatusColor(meta.detectionStatus);

                  return (
                    <tr key={episode.id} className="transition-colors hover:bg-white/[0.02] group">
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="max-w-[240px] truncate font-bold text-white group-hover:text-primaryColor transition-colors">
                            {episode.movie?.name || "Chưa có tên"}
                          </span>
                          <span className="mt-1 inline-block rounded bg-white/10 px-2 py-0.5 text-[10px] font-medium uppercase text-gray-400 w-max">
                            {episode.audioType || "Mặc định"}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <div className="inline-flex h-8 min-w-[32px] items-center justify-center rounded-lg bg-black/50 px-2 font-bold text-white border border-white/5 shadow-inner">
                          {episode.episode}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center justify-center gap-2">
                          <input
                            type="number"
                            min="0"
                            placeholder="Bắt đầu"
                            value={draft.introStartSec}
                            onChange={(event) => updateDraft(episode.id, { introStartSec: event.target.value })}
                            className="h-9 w-20 rounded-md border border-white/10 bg-black/60 px-2 text-center text-white outline-none transition-colors focus:border-primaryColor focus:bg-black"
                          />
                          <i className="fa-solid fa-arrow-right text-gray-600 text-[10px]"></i>
                          <input
                            type="number"
                            min="0"
                            placeholder="Kết thúc"
                            value={draft.introEndSec}
                            onChange={(event) => updateDraft(episode.id, { introEndSec: event.target.value })}
                            className="h-9 w-20 rounded-md border border-white/10 bg-black/60 px-2 text-center text-white outline-none transition-colors focus:border-primaryColor focus:bg-black"
                          />
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <input
                          type="number"
                          min="0"
                          placeholder="Giây bắt đầu outro"
                          value={draft.outroStartSec}
                          onChange={(event) => updateDraft(episode.id, { outroStartSec: event.target.value })}
                          className="h-9 w-24 rounded-md border border-white/10 bg-black/60 px-2 text-center text-white outline-none transition-colors focus:border-primaryColor focus:bg-black"
                        />
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-center justify-center gap-1.5">
                          <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wider ${statusColorClass}`}>
                            {meta.detectionStatus === 'approved' && <i className="fa-solid fa-check"></i>}
                            {meta.detectionStatus === 'needs_review' && <i className="fa-solid fa-eye"></i>}
                            {meta.detectionStatus === 'detected' && <i className="fa-solid fa-wand-magic-sparkles"></i>}
                            {meta.detectionStatus === 'failed' && <i className="fa-solid fa-xmark"></i>}
                            {meta.detectionStatus || "CHƯA CÓ"}
                          </span>
                          {(meta.detectionSource || meta.confidence) && (
                            <div className="text-[10px] text-gray-500 font-medium">
                              {meta.detectionSource || "none"} • {Math.round((meta.confidence || 0) * 100)}% độ tin cậy
                            </div>
                          )}
                          {meta.detectionNote && (
                            <div className="mt-1 w-full max-w-[160px] truncate rounded bg-yellow-500/10 px-1.5 py-0.5 text-center text-[10px] text-yellow-300 border border-yellow-500/20" title={meta.detectionNote}>
                              {meta.detectionNote}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-center">
                          <label
                            title="Copy thoi gian nay sang cac tap cung audio"
                            className="flex cursor-pointer items-center gap-2 rounded-lg border border-white/5 bg-black/30 px-3 py-1.5 transition-colors hover:bg-black/60"
                          >
                            <div className="relative flex items-center">
                              <input
                                type="checkbox"
                                checked={draft.applyToSeason}
                                onChange={(event) =>
                                  updateDraft(episode.id, { applyToSeason: event.target.checked })
                                }
                                className="peer sr-only"
                              />
                              <div className="h-5 w-5 rounded border border-white/20 bg-transparent peer-checked:border-primaryColor peer-checked:bg-primaryColor transition-all flex items-center justify-center">
                                <i className="fa-solid fa-check text-[10px] text-black opacity-0 peer-checked:opacity-100 transition-opacity"></i>
                              </div>
                            </div>
                            <span className="text-xs font-medium text-gray-300 peer-checked:text-white select-none whitespace-nowrap">
                              Áp dụng cả bộ
                            </span>
                          </label>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex justify-end gap-2">
                          <div className="flex bg-black/40 rounded-lg border border-white/10 overflow-hidden shadow-sm">
                            <button
                              onClick={() => openPreview(episode)}
                              disabled={!getIntroPreviewRange(draft)}
                              title="Xem thử video"
                              className="flex h-9 w-9 items-center justify-center text-emerald-400 hover:bg-emerald-500/20 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
                            >
                              <i className="fa-solid fa-play"></i>
                            </button>
                            <div className="w-px bg-white/10"></div>
                            <button
                              onClick={() => openDetectOptions(episode)}
                              title="Dùng AI nhận diện Intro/Outro"
                              className="flex h-9 w-9 items-center justify-center text-blue-400 hover:bg-blue-500/20 transition-colors"
                            >
                              <i className="fa-solid fa-wand-magic-sparkles"></i>
                            </button>
                          </div>

                          <div className="flex gap-1.5 ml-1">
                            <button
                              onClick={() => saveEpisode(episode, "needs_review")}
                              disabled={savingId === episode.id}
                              className="flex h-9 items-center justify-center rounded-lg border border-orange-500/30 bg-orange-500/10 px-3 text-xs font-semibold text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors shadow-sm"
                            >
                              Cần duyệt
                            </button>
                            <button
                              onClick={() => saveEpisode(episode, "approved")}
                              disabled={savingId === episode.id}
                              className="flex h-9 items-center justify-center rounded-lg bg-primaryColor px-4 text-xs font-bold text-black shadow-md hover:bg-primaryColor/90 disabled:opacity-50 transition-all active:scale-95"
                            >
                              <i className="fa-solid fa-check mr-1.5"></i> Duyệt
                            </button>
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 bg-black/40 px-6 py-4 sm:flex-row">
          <span className="text-sm font-medium text-gray-400">
            Tổng cộng <span className="text-white font-bold">{pagination.total}</span> tập phim — Trang <span className="text-white font-bold">{pagination.page}</span> / {Math.max(1, pagination.totalPages || 1)}
          </span>
          <PaginationV2
            page={pagination.page}
            totalPages={Math.max(1, pagination.totalPages || 1)}
            onPageChange={(nextPage) => {
              if (!loading) loadEpisodes(nextPage);
            }}
            className={loading ? "pointer-events-none opacity-60" : ""}
          />
        </div>
      </div>

      <PreviewModal
        preview={preview}
        saving={savingId === preview?.episode?.id}
        onClose={() => setPreview(null)}
        onApprove={() => savePreviewEpisode("approved")}
        onNeedsReview={() => savePreviewEpisode("needs_review")}
      />
      <DetectOptionsModal
        config={detectConfig}
        saving={Boolean(activeJobId)}
        onClose={() => setDetectConfig(null)}
        onChange={updateDetectConfig}
        onSubmit={submitDetectOptions}
      />
    </div>
  );
};

export default AdminPlaybackTab;
