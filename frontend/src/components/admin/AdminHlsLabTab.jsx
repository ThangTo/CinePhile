import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Hls from "hls.js";
import {
  AlertTriangle,
  CheckCircle2,
  Clipboard,
  Code2,
  Copy,
  FileSearch,
  Filter,
  Film,
  Link2,
  ListVideo,
  Loader2,
  Play,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Video,
} from "lucide-react";
import { hlsLabAPI, movieAPI } from "services/admin.service";
import movieService from "services/movie.service";
import useToast from "hooks/useToast";

const SAMPLE_SNIPPET = [
  "#EXT-X-DISCONTINUITY",
  "#EXTINF:2.32,",
  "convertv8/BC3F2R4R.ts",
  "#EXT-X-DISCONTINUITY",
  "#EXTINF:4.0,",
  "convertv8/ZNHmEpe5.ts",
  "#EXT-X-DISCONTINUITY",
].join("\n");

function formatSeconds(value) {
  const seconds = Number(value);
  if (!Number.isFinite(seconds)) return "0s";
  if (seconds < 60) return `${seconds.toFixed(1)}s`;
  const minutes = Math.floor(seconds / 60);
  const rest = Math.round(seconds % 60);
  return `${minutes}:${String(rest).padStart(2, "0")}`;
}

function getMovieTitle(movie) {
  return movie?.name || movie?.title || "Chưa có tên";
}

function getMovieSubtitle(movie) {
  return movie?.original_name || movie?.origin_name || movie?.original_title || movie?.slug || "";
}

function getEpisodeLabel(episode) {
  const number = episode?.episodeId || episode?.episode_number || episode?.episode || "";
  const audio = episode?.audioType || episode?.serverName || "";
  return [number ? `Tập ${number}` : "Tập", audio].filter(Boolean).join(" - ");
}

function getSourceBaseUrl(url) {
  if (!url) return "";
  try {
    const parsed = new URL(url);
    return parsed.toString();
  } catch {
    return url;
  }
}

function formatHlsPreviewError(data) {
  const details = data?.details || "Không phát được preview HLS";
  const status = data?.response?.code ? `HTTP ${data.response.code}` : "";
  const failedUrl = data?.frag?.url || data?.response?.url || data?.context?.url || "";
  return [details, status, failedUrl].filter(Boolean).join(" - ");
}

function Metric({ icon: Icon, label, value, tone = "neutral" }) {
  const toneClass =
    tone === "warn"
      ? "border-amber-400/20 bg-amber-400/10 text-amber-200"
      : tone === "good"
      ? "border-emerald-400/20 bg-emerald-400/10 text-emerald-200"
      : "border-white/10 bg-white/[0.04] text-gray-200";

  return (
    <div className={`rounded-lg border px-4 py-3 ${toneClass}`}>
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-400">
        <Icon size={15} />
        {label}
      </div>
      <div className="mt-2 text-xl font-bold text-white">{value}</div>
    </div>
  );
}

function StatsGrid({ rawStats, filteredStats }) {
  const removed = Math.max(0, Number(rawStats?.segmentCount || 0) - Number(filteredStats?.segmentCount || 0));
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      <Metric icon={ListVideo} label="Segment raw" value={rawStats?.segmentCount ?? 0} />
      <Metric icon={Filter} label="Đã lọc" value={removed} tone={removed > 0 ? "good" : "neutral"} />
      <Metric icon={AlertTriangle} label="Nghi vấn" value={rawStats?.suspiciousCount ?? 0} tone={rawStats?.suspiciousCount ? "warn" : "neutral"} />
      <Metric icon={RefreshCw} label="Discontinuity" value={rawStats?.discontinuityCount ?? 0} />
      <Metric icon={Video} label="Thời lượng raw" value={formatSeconds(rawStats?.totalDuration)} />
      <Metric icon={ShieldCheck} label="Segment đã lọc" value={filteredStats?.segmentCount ?? 0} />
      <Metric icon={Code2} label="Dòng raw" value={rawStats?.lineCount ?? 0} />
      <Metric icon={CheckCircle2} label="Dòng filtered" value={filteredStats?.lineCount ?? 0} />
    </div>
  );
}

function CodeViewer({ title, value, onCopy }) {
  return (
    <section className="rounded-lg border border-white/10 bg-[#111114]">
      <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
        <div className="flex items-center gap-2 text-sm font-semibold text-white">
          <Code2 size={16} className="text-primaryColor" />
          {title}
        </div>
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-gray-200 transition-colors hover:bg-white/10"
        >
          <Copy size={15} />
          Sao chép
        </button>
      </div>
      <textarea
        readOnly
        value={value || ""}
        spellCheck={false}
        className="min-h-[420px] w-full resize-y bg-black/40 p-4 font-mono text-xs leading-relaxed text-gray-200 outline-none custom-scrollbar"
      />
    </section>
  );
}

function SuspiciousList({ stats }) {
  const items = stats?.suspiciousSegments || [];
  if (!items.length) {
    return (
      <div className="rounded-lg border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
        Chưa thấy segment nào khớp marker nghi vấn trong playlist đang xem.
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-white/10 bg-[#111114]">
      <div className="border-b border-white/10 px-4 py-3 text-sm font-semibold text-white">
        Segment nghi vấn
      </div>
      <div className="max-h-[300px] overflow-auto custom-scrollbar">
        {items.map((item) => (
          <div key={`${item.lineNumber}-${item.uri}`} className="border-b border-white/5 px-4 py-3 last:border-b-0">
            <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
              <span>Dòng {item.lineNumber}</span>
              {item.duration ? <span>{formatSeconds(item.duration)}</span> : null}
              {item.reasons.map((reason) => (
                <span key={reason} className="rounded-full bg-amber-400/10 px-2 py-0.5 text-amber-200">
                  {reason}
                </span>
              ))}
            </div>
            <div className="mt-2 break-all font-mono text-xs text-gray-200">{item.uri}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

const AdminHlsLabTab = () => {
  const { showToast } = useToast();
  const videoRef = useRef(null);
  const hlsRef = useRef(null);
  const blobUrlRef = useRef(null);

  const [searchQuery, setSearchQuery] = useState("");
  const [movies, setMovies] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedMovie, setSelectedMovie] = useState(null);
  const [episodes, setEpisodes] = useState([]);
  const [loadingEpisodes, setLoadingEpisodes] = useState(false);
  const [selectedEpisode, setSelectedEpisode] = useState(null);

  const [sourceUrl, setSourceUrl] = useState("");
  const [selectedVariantUrl, setSelectedVariantUrl] = useState("");
  const [customPatterns, setCustomPatterns] = useState("");
  const [segmentMode, setSegmentMode] = useState("direct");
  const [inspectResult, setInspectResult] = useState(null);
  const [inspecting, setInspecting] = useState(false);
  const [activeCode, setActiveCode] = useState("raw");

  const [snippet, setSnippet] = useState(SAMPLE_SNIPPET);
  const [snippetBaseUrl, setSnippetBaseUrl] = useState("");
  const [snippetResult, setSnippetResult] = useState(null);
  const [processingSnippet, setProcessingSnippet] = useState(false);
  const [activeSnippetCode, setActiveSnippetCode] = useState("raw");

  const [previewTitle, setPreviewTitle] = useState("");
  const [previewSource, setPreviewSource] = useState("");
  const [previewError, setPreviewError] = useState("");

  const codeValue = activeCode === "filtered" ? inspectResult?.filteredContent : inspectResult?.rawContent;
  const snippetCodeValue = activeSnippetCode === "filtered" ? snippetResult?.filteredContent : snippetResult?.rawContent;
  const effectiveSnippetBaseUrl = useMemo(
    () => snippetBaseUrl.trim() || inspectResult?.sourceUrl || sourceUrl.trim(),
    [snippetBaseUrl, inspectResult?.sourceUrl, sourceUrl],
  );

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setMovies([]);
      return undefined;
    }

    const timer = setTimeout(async () => {
      setSearching(true);
      try {
        const response = await movieAPI.getAll({ search: searchQuery.trim(), limit: 12 });
        setMovies(response?.data || response || []);
      } catch (error) {
        showToast(error.message || "Không tìm được phim", "error");
      } finally {
        setSearching(false);
      }
    }, 350);

    return () => clearTimeout(timer);
  }, [searchQuery, showToast]);

  useEffect(() => {
    if (!selectedMovie) {
      setEpisodes([]);
      setSelectedEpisode(null);
      return;
    }

    const loadEpisodes = async () => {
      setLoadingEpisodes(true);
      try {
        const response = await movieService.getEpisodes(selectedMovie._id || selectedMovie.id);
        const nextEpisodes = response?.data || response || [];
        setEpisodes(nextEpisodes);
        const firstPlayable = nextEpisodes.find((episode) => episode.link_m3u8) || nextEpisodes[0] || null;
        setSelectedEpisode(firstPlayable);
        if (firstPlayable?.link_m3u8) {
          setSourceUrl(firstPlayable.link_m3u8);
          setSelectedVariantUrl("");
          setSnippetBaseUrl(getSourceBaseUrl(firstPlayable.link_m3u8));
        }
      } catch (error) {
        showToast(error.message || "Không tải được tập phim", "error");
      } finally {
        setLoadingEpisodes(false);
      }
    };

    loadEpisodes();
  }, [selectedMovie, showToast]);

  useEffect(() => {
    if (!selectedEpisode?.link_m3u8) return;
    setSourceUrl(selectedEpisode.link_m3u8);
    setSelectedVariantUrl("");
    setSnippetBaseUrl(getSourceBaseUrl(selectedEpisode.link_m3u8));
  }, [selectedEpisode]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video || !previewSource) return undefined;

    let closed = false;
    setPreviewError("");

    if (hlsRef.current) {
      hlsRef.current.destroy();
      hlsRef.current = null;
    }

    const cleanupVideo = () => {
      closed = true;
      video.pause();
      video.removeAttribute("src");
      video.load();
      if (hlsRef.current) {
        hlsRef.current.destroy();
        hlsRef.current = null;
      }
    };

    if (Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: false,
      });
      hls.on(Hls.Events.ERROR, (_event, data) => {
        if (data?.fatal && !closed) {
          setPreviewError(formatHlsPreviewError(data));
        }
      });
      hls.loadSource(previewSource);
      hls.attachMedia(video);
      hlsRef.current = hls;
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      video.src = previewSource;
    } else {
      setPreviewError("Trình duyệt không hỗ trợ HLS");
    }

    return cleanupVideo;
  }, [previewSource]);

  const inspectPlaylist = useCallback(async () => {
    if (!sourceUrl.trim()) {
      showToast("Cần có URL m3u8", "warning");
      return;
    }
    setInspecting(true);
    try {
      const result = await hlsLabAPI.inspect({
        url: sourceUrl.trim(),
        patterns: customPatterns,
        variantUrl: selectedVariantUrl,
      });
      setInspectResult(result);
      setSelectedVariantUrl(result?.selectedVariant?.uri || "");
      if (result?.sourceUrl) {
        setSnippetBaseUrl(result.sourceUrl);
      }
      setActiveCode("raw");
    } catch (error) {
      showToast(error.message || "Không đọc được playlist", "error");
    } finally {
      setInspecting(false);
    }
  }, [sourceUrl, customPatterns, selectedVariantUrl, showToast]);

  const processSnippet = useCallback(async () => {
    if (!snippet.trim()) {
      showToast("Cần paste nội dung nghi vấn", "warning");
      return null;
    }
    setProcessingSnippet(true);
    try {
      const result = await hlsLabAPI.processSnippet({
        content: snippet,
        baseUrl: effectiveSnippetBaseUrl,
        patterns: customPatterns,
        segmentMode,
      });
      setSnippetResult(result);
      setActiveSnippetCode("raw");
      return result;
    } catch (error) {
      showToast(error.message || "Không xử lý được snippet", "error");
      return null;
    } finally {
      setProcessingSnippet(false);
    }
  }, [snippet, effectiveSnippetBaseUrl, customPatterns, segmentMode, showToast]);

  const copyText = useCallback(
    async (value) => {
      if (!value) return;
      try {
        await navigator.clipboard.writeText(value);
        showToast("Đã copy", "success");
      } catch {
        showToast("Không copy được", "error");
      }
    },
    [showToast],
  );

  const loadPreviewPlaylistText = useCallback((content, title) => {
    if (!content) return;
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
    }
    const blob = new Blob([content], { type: "application/vnd.apple.mpegurl" });
    const url = URL.createObjectURL(blob);
    blobUrlRef.current = url;
    setPreviewTitle(title);
    setPreviewSource(url);
  }, []);

  const previewPlaylist = useCallback(
    async (variant) => {
      if (!sourceUrl.trim()) {
        showToast("Cần có URL m3u8", "warning");
        return;
      }

      try {
        const content = await hlsLabAPI.getPlaylistText({
          url: sourceUrl.trim(),
          variant,
          segmentMode,
          patterns: customPatterns,
          variantUrl: selectedVariantUrl,
        });
        loadPreviewPlaylistText(
          content,
          `${variant === "filtered" ? "Đã lọc" : "Raw"} - ${getEpisodeLabel(selectedEpisode)}`,
        );
      } catch (error) {
        showToast(error.message || "Không tạo được playlist preview", "error");
      }
    },
    [sourceUrl, customPatterns, selectedVariantUrl, selectedEpisode, segmentMode, loadPreviewPlaylistText, showToast],
  );

  const previewSnippet = useCallback(
    async (variant) => {
      const result = await processSnippet();
      if (!result) return;
      const content = variant === "filtered" ? result.previewFilteredContent : result.previewRawContent;
      loadPreviewPlaylistText(content, `Snippet ${variant === "filtered" ? "đã lọc" : "raw"}`);
    },
    [processSnippet, loadPreviewPlaylistText],
  );

  const rawStats = inspectResult?.rawStats;
  const filteredStats = inspectResult?.filteredStats;
  const snippetRawStats = snippetResult?.rawStats;
  const snippetFilteredStats = snippetResult?.filteredStats;

  const movieResults = useMemo(() => movies.slice(0, 12), [movies]);

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-primaryColor text-black">
              <FileSearch size={22} />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-white">HLS Ad Lab</h1>
              <p className="mt-1 text-sm text-gray-400">Kiểm tra playlist, segment nghi vấn và kết quả lọc quảng cáo.</p>
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={inspectPlaylist}
            disabled={inspecting || !sourceUrl.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-md bg-primaryColor px-4 font-semibold text-black transition-opacity disabled:cursor-not-allowed disabled:opacity-50"
          >
            {inspecting ? <Loader2 size={17} className="animate-spin" /> : <FileSearch size={17} />}
            Đọc playlist
          </button>
          <button
            type="button"
            onClick={() => previewPlaylist("raw")}
            disabled={!sourceUrl.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-4 text-sm font-semibold text-white transition-colors hover:bg-white/10 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Play size={17} />
            Xem raw
          </button>
          <button
            type="button"
            onClick={() => previewPlaylist("filtered")}
            disabled={!sourceUrl.trim()}
            className="inline-flex h-10 items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-4 text-sm font-semibold text-emerald-100 transition-colors hover:bg-emerald-400/20 disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Filter size={17} />
            Xem đã lọc
          </button>
        </div>
      </div>

      <div className="grid gap-6 xl:grid-cols-[360px_minmax(0,1fr)]">
        <section className="space-y-4 rounded-lg border border-white/10 bg-[#111114] p-4">
          <div>
            <label className="mb-2 block text-sm font-semibold text-gray-200">Tìm phim</label>
            <div className="relative">
              <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-gray-500" />
              <input
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="h-11 w-full rounded-md border border-white/10 bg-black/30 pl-10 pr-3 text-sm text-white outline-none transition-colors focus:border-primaryColor/60"
                placeholder="Nhập tên phim..."
              />
              {searching ? <Loader2 size={17} className="absolute right-3 top-1/2 -translate-y-1/2 animate-spin text-primaryColor" /> : null}
            </div>
          </div>

          <div className="max-h-[360px] space-y-2 overflow-auto custom-scrollbar">
            {movieResults.map((movie) => {
              const selected = String(selectedMovie?._id || selectedMovie?.id) === String(movie._id || movie.id);
              return (
                <button
                  key={movie._id || movie.id}
                  type="button"
                  onClick={() => setSelectedMovie(movie)}
                  className={`flex w-full items-center gap-3 rounded-lg border p-2 text-left transition-colors ${
                    selected ? "border-primaryColor/60 bg-primaryColor/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                  }`}
                >
                  <img
                    src={movie.thumb_url || movie.poster_url || "/placeholder-poster.jpg"}
                    alt=""
                    className="h-14 w-10 rounded object-cover bg-black"
                    onError={(event) => {
                      event.currentTarget.style.display = "none";
                    }}
                  />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{getMovieTitle(movie)}</span>
                    <span className="mt-1 block truncate text-xs text-gray-400">{getMovieSubtitle(movie)}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="border-t border-white/10 pt-4">
            <div className="mb-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Film size={16} className="text-primaryColor" />
                Tập phim
              </div>
              {loadingEpisodes ? <Loader2 size={16} className="animate-spin text-primaryColor" /> : null}
            </div>
            <div className="max-h-[420px] space-y-2 overflow-auto custom-scrollbar">
              {episodes.map((episode) => {
                const selected = String(selectedEpisode?._id || selectedEpisode?.id) === String(episode._id || episode.id);
                return (
                  <button
                    key={episode._id || episode.id || `${episode.episodeId}-${episode.audioType}`}
                    type="button"
                    onClick={() => setSelectedEpisode(episode)}
                    className={`w-full rounded-lg border p-3 text-left transition-colors ${
                      selected ? "border-primaryColor/60 bg-primaryColor/10" : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="text-sm font-semibold text-white">{getEpisodeLabel(episode)}</span>
                      {episode.link_m3u8 ? <Link2 size={15} className="text-emerald-300" /> : <AlertTriangle size={15} className="text-amber-300" />}
                    </div>
                    <div className="mt-2 line-clamp-2 break-all font-mono text-[11px] text-gray-400">
                      {episode.link_m3u8 || "Không có link_m3u8"}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </section>

        <div className="space-y-6">
          <section className="rounded-lg border border-white/10 bg-[#111114] p-4">
            <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px_220px]">
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">URL m3u8 đang kiểm tra</label>
                <input
                  value={sourceUrl}
                  onChange={(event) => {
                    setSourceUrl(event.target.value);
                    setSelectedVariantUrl("");
                  }}
                  className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 font-mono text-xs text-white outline-none transition-colors focus:border-primaryColor/60"
                  placeholder="https://.../index.m3u8"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">Pattern thử nghiệm</label>
                <input
                  value={customPatterns}
                  onChange={(event) => setCustomPatterns(event.target.value)}
                  className="h-11 w-full rounded-md border border-white/10 bg-black/30 px-3 font-mono text-xs text-white outline-none transition-colors focus:border-primaryColor/60"
                  placeholder="/v8/, convertv8/"
                />
              </div>
              <div>
                <label className="mb-2 block text-sm font-semibold text-gray-200">Cách tải segment</label>
                <div className="grid h-11 grid-cols-2 rounded-md border border-white/10 bg-black/30 p-1">
                  {[
                    { id: "direct", label: "Trực tiếp" },
                    { id: "proxy", label: "Proxy" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setSegmentMode(item.id)}
                      className={`rounded text-sm font-semibold transition-colors ${
                        segmentMode === item.id ? "bg-primaryColor text-black" : "text-gray-300 hover:bg-white/10"
                      }`}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>
            {inspectResult ? (
              <div className="mt-4 rounded-lg border border-white/10 bg-black/20 p-4">
                <div className="grid gap-3 lg:grid-cols-2">
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">DB URL</div>
                    <div className="mt-1 break-all font-mono text-xs text-gray-300">
                      {inspectResult.originalUrl || sourceUrl}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs font-semibold uppercase tracking-wide text-gray-500">Media URL đang đọc</div>
                    <div className="mt-1 break-all font-mono text-xs text-emerald-200">
                      {inspectResult.sourceUrl || sourceUrl}
                    </div>
                  </div>
                </div>
                {inspectResult.resolvedFromMaster ? (
                  <div className="mt-3 rounded-md border border-emerald-400/20 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-100">
                    Đã tự động resolve master playlist xuống media playlist:{" "}
                    <span className="font-mono text-xs">{inspectResult.selectedVariant?.rawUri || inspectResult.selectedVariant?.uri}</span>
                  </div>
                ) : null}
                {inspectResult.variants?.length ? (
                  <div className="mt-4">
                    <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">
                      Biến thể trong master playlist
                    </div>
                    <div className="grid gap-2 md:grid-cols-2 xl:grid-cols-3">
                      {inspectResult.variants.map((variant) => {
                        const active = selectedVariantUrl === variant.uri || inspectResult.selectedVariant?.uri === variant.uri;
                        return (
                          <button
                            key={variant.uri}
                            type="button"
                            onClick={() => {
                              setSelectedVariantUrl(variant.uri);
                              setSourceUrl(inspectResult.originalUrl || sourceUrl);
                            }}
                            className={`rounded-md border p-3 text-left transition-colors ${
                              active
                                ? "border-primaryColor/60 bg-primaryColor/10"
                                : "border-white/10 bg-white/[0.03] hover:bg-white/[0.07]"
                            }`}
                          >
                            <div className="flex items-center justify-between gap-2 text-sm font-semibold text-white">
                              <span>{variant.resolution || "auto"}</span>
                              <span className="text-xs text-primaryColor">{variant.bandwidth ? `${Math.round(variant.bandwidth / 1000)}kb` : ""}</span>
                            </div>
                            <div className="mt-2 break-all font-mono text-[11px] text-gray-400">{variant.rawUri}</div>
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}
          </section>

          {inspectResult ? (
            <>
              <StatsGrid rawStats={rawStats} filteredStats={filteredStats} />
              <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_360px]">
                <div className="space-y-3">
                  <div className="inline-flex rounded-md border border-white/10 bg-white/[0.03] p-1">
                    {[
                      { id: "raw", label: "Raw" },
                      { id: "filtered", label: "Filtered" },
                    ].map((item) => (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => setActiveCode(item.id)}
                        className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
                          activeCode === item.id ? "bg-primaryColor text-black" : "text-gray-300 hover:bg-white/10"
                        }`}
                      >
                        {item.label}
                      </button>
                    ))}
                  </div>
                  <CodeViewer
                    title={activeCode === "filtered" ? "Playlist sau khi lọc" : "Playlist raw chưa lọc"}
                    value={codeValue}
                    onCopy={() => copyText(codeValue)}
                  />
                </div>
                <SuspiciousList stats={rawStats} />
              </div>
            </>
          ) : (
            <div className="rounded-lg border border-white/10 bg-white/[0.03] p-8 text-center text-gray-400">
              <FileSearch className="mx-auto mb-3 text-primaryColor" size={36} />
              Chọn tập phim hoặc paste URL m3u8 rồi bấm Đọc playlist.
            </div>
          )}

          <section className="rounded-lg border border-white/10 bg-[#111114]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Clipboard size={16} className="text-primaryColor" />
                Snippet nghi vấn
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={processSnippet}
                  disabled={processingSnippet}
                  className="inline-flex h-9 items-center gap-2 rounded-md bg-primaryColor px-3 text-sm font-semibold text-black disabled:opacity-50"
                >
                  {processingSnippet ? <Loader2 size={15} className="animate-spin" /> : <Sparkles size={15} />}
                  Phân tích
                </button>
                <button
                  type="button"
                  onClick={() => previewSnippet("raw")}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-white/10 bg-white/5 px-3 text-sm text-white hover:bg-white/10"
                >
                  <Play size={15} />
                  Raw
                </button>
                <button
                  type="button"
                  onClick={() => previewSnippet("filtered")}
                  className="inline-flex h-9 items-center gap-2 rounded-md border border-emerald-400/30 bg-emerald-400/10 px-3 text-sm text-emerald-100 hover:bg-emerald-400/20"
                >
                  <Filter size={15} />
                  Filtered
                </button>
              </div>
            </div>
            <div className="grid gap-4 p-4 xl:grid-cols-2">
              <div className="space-y-3">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-gray-200">Base URL để resolve segment tương đối</label>
                  <input
                    value={snippetBaseUrl}
                    onChange={(event) => setSnippetBaseUrl(event.target.value)}
                    className="h-10 w-full rounded-md border border-white/10 bg-black/30 px-3 font-mono text-xs text-white outline-none focus:border-primaryColor/60"
                    placeholder="https://domain/path/index.m3u8"
                  />
                </div>
                <textarea
                  value={snippet}
                  onChange={(event) => setSnippet(event.target.value)}
                  spellCheck={false}
                  className="min-h-[300px] w-full resize-y rounded-md border border-white/10 bg-black/40 p-4 font-mono text-xs leading-relaxed text-gray-200 outline-none focus:border-primaryColor/60 custom-scrollbar"
                />
              </div>
              <div className="space-y-3">
                {snippetResult ? (
                  <>
                    <StatsGrid rawStats={snippetRawStats} filteredStats={snippetFilteredStats} />
                    <div className="inline-flex rounded-md border border-white/10 bg-white/[0.03] p-1">
                      {[
                        { id: "raw", label: "Raw" },
                        { id: "filtered", label: "Filtered" },
                      ].map((item) => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => setActiveSnippetCode(item.id)}
                          className={`rounded px-4 py-2 text-sm font-semibold transition-colors ${
                            activeSnippetCode === item.id ? "bg-primaryColor text-black" : "text-gray-300 hover:bg-white/10"
                          }`}
                        >
                          {item.label}
                        </button>
                      ))}
                    </div>
                    <CodeViewer
                      title="Kết quả snippet"
                      value={snippetCodeValue}
                      onCopy={() => copyText(snippetCodeValue)}
                    />
                  </>
                ) : (
                  <div className="flex min-h-[300px] items-center justify-center rounded-lg border border-white/10 bg-white/[0.03] text-center text-sm text-gray-400">
                    Paste đoạn #EXTINF/segment nghi vấn và bấm Phân tích.
                  </div>
                )}
              </div>
            </div>
          </section>

          <section className="rounded-lg border border-white/10 bg-[#111114]">
            <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
              <div className="flex items-center gap-2 text-sm font-semibold text-white">
                <Video size={16} className="text-primaryColor" />
                Xem thử video
              </div>
              <div className="max-w-[65%] truncate text-xs text-gray-400">{previewTitle || "Chưa có preview"}</div>
            </div>
            <div className="p-4">
              <div className="overflow-hidden rounded-lg border border-white/10 bg-black">
                <video ref={videoRef} controls className="aspect-video w-full bg-black" />
              </div>
              {previewError ? (
                <div className="mt-3 rounded-md border border-red-400/20 bg-red-400/10 px-3 py-2 text-sm text-red-100">
                  {previewError}
                </div>
              ) : null}
            </div>
          </section>
        </div>
      </div>
    </div>
  );
};

export default AdminHlsLabTab;
