import React, { useState, useEffect, useRef, useCallback } from "react";
import { settingsAPI } from "services/admin.service";
import apiRequest from "services/utils/apiRequest";
import { FiMonitor, FiCheck, FiX, FiLoader, FiPlay } from "react-icons/fi";
import PaginationV2 from "components/common/PaginationV2";

const PROCESS_STATUS_STORAGE_KEY = "cinephine_admin_subtitle_process_status";

const readPersistedProcessStatus = () => {
  try {
    const raw = sessionStorage.getItem(PROCESS_STATUS_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch (_error) {
    return {};
  }
};

const getEpisodeTargetId = (episode) => episode?._id || episode?.id || episode?.episodeId || null;
const getMovieTargetId = (episode) => episode?.movieId?._id || episode?.movieId || null;

const AdminSubtitlesTab = () => {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pagination, setPagination] = useState({ page: 1, limit: 20, total: 0, pages: 1 });
  
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [isProcessing, setIsProcessing] = useState(false);
  const [processStatus, setProcessStatus] = useState(readPersistedProcessStatus); // { [id]: { status, progress, error } }
  
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(false);
  const activePollIntervalsRef = useRef(new Set());
  const autoSyncTimerRef = useRef(null);
  const syncInFlightRef = useRef(false);
  const processStatusRef = useRef(processStatus);

  const clearActivePollIntervals = useCallback(() => {
    activePollIntervalsRef.current.forEach((intervalId) => clearInterval(intervalId));
    activePollIntervalsRef.current.clear();
  }, []);

  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
      if (autoSyncTimerRef.current) {
        clearInterval(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    processStatusRef.current = processStatus;
    try {
      sessionStorage.setItem(PROCESS_STATUS_STORAGE_KEY, JSON.stringify(processStatus));
    } catch (_error) {
      // Ignore sessionStorage failures (private mode / quota)
    }
  }, [processStatus]);

  const safeSetProcessStatus = useCallback((updater) => {
    if (!isMountedRef.current) return;
    setProcessStatus(updater);
  }, []);

  const fetchEpisodeStatus = useCallback(async (episode) => {
    const movieId = getMovieTargetId(episode);
    const episodeId = getEpisodeTargetId(episode);
    const statusKey = episode?._id || episodeId;

    if (!movieId || !episodeId || !statusKey) {
      return {
        statusKey,
        status: "failed",
        progress: 0,
        error: "Missing episode identity",
      };
    }

    try {
      const res = await apiRequest(`/movies/${movieId}/episodes/${episodeId}/subtitles/korean/status`, {
        requiresAuth: false,
      });

      if (!res?.success) {
        return {
          statusKey,
          status: "failed",
          progress: 0,
          error: res?.message || "Unable to fetch subtitle status",
        };
      }

      return {
        statusKey,
        status: res.status,
        progress: Number.isFinite(res.progress) ? res.progress : 0,
        error: res.error || null,
      };
    } catch (error) {
      return {
        statusKey,
        status: "failed",
        progress: 0,
        error: error.message,
      };
    }
  }, []);

  const syncStatuses = useCallback(async (episodes) => {
    const targets = Array.isArray(episodes) ? episodes : [];
    if (targets.length === 0) {
      return { processingCount: 0, readyCount: 0, failedCount: 0 };
    }

    const statusList = await Promise.all(targets.map(fetchEpisodeStatus));

    let processingCount = 0;
    let readyCount = 0;
    let failedCount = 0;

    statusList.forEach((statusItem) => {
      if (statusItem.status === "processing") processingCount += 1;
      if (statusItem.status === "ready") readyCount += 1;
      if (statusItem.status === "failed") failedCount += 1;
    });

    safeSetProcessStatus((prev) => {
      const next = { ...prev };
      statusList.forEach((statusItem) => {
        if (!statusItem.statusKey) return;
        next[statusItem.statusKey] = {
          status: statusItem.status,
          progress: statusItem.progress,
          error: statusItem.error,
        };
      });
      return next;
    });

    return { processingCount, readyCount, failedCount };
  }, [fetchEpisodeStatus, safeSetProcessStatus]);

  const fetchRequests = useCallback(async (page = 1, { silent = false } = {}) => {
    try {
      if (!silent && isMountedRef.current) {
        setLoading(true);
      }

      const res = await settingsAPI.getSubtitleRequests({ page, limit: pagination.limit });
      if (res.success) {
        const nextRequests = Array.isArray(res.data) ? res.data : [];
        if (!isMountedRef.current) return;
        setRequests(nextRequests);
        setPagination(res.pagination);
        await syncStatuses(nextRequests);
      }
    } catch (error) {
      console.error("Failed to fetch subtitle requests:", error);
    } finally {
      if (!silent && isMountedRef.current) {
        setLoading(false);
      }
    }
  }, [pagination.limit, syncStatuses]);

  useEffect(() => {
    fetchRequests(pagination.page);
  }, [fetchRequests, pagination.page]);

  useEffect(() => {
    if (autoSyncTimerRef.current) {
      clearInterval(autoSyncTimerRef.current);
      autoSyncTimerRef.current = null;
    }

    autoSyncTimerRef.current = setInterval(async () => {
      if (!isMountedRef.current || syncInFlightRef.current || requests.length === 0) {
        return;
      }

      const hasProcessing = requests.some(
        (episode) => processStatusRef.current[episode._id]?.status === "processing",
      );
      if (!hasProcessing && !isProcessing) {
        return;
      }

      syncInFlightRef.current = true;
      try {
        const summary = await syncStatuses(requests);
        if (summary.readyCount > 0) {
          await fetchRequests(pagination.page, { silent: true });
        }
      } finally {
        syncInFlightRef.current = false;
      }
    }, 5000);

    return () => {
      if (autoSyncTimerRef.current) {
        clearInterval(autoSyncTimerRef.current);
        autoSyncTimerRef.current = null;
      }
    };
  }, [fetchRequests, isProcessing, pagination.page, requests, syncStatuses]);

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = requests.map(r => r._id);
      setSelectedIds(new Set(allIds));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleSelect = (id) => {
    const newSelected = new Set(selectedIds);
    if (newSelected.has(id)) {
      newSelected.delete(id);
    } else {
      newSelected.add(id);
    }
    setSelectedIds(newSelected);
  };

  const pollStatus = useCallback(async (movieId, episodeId, cacheIdentity, signal) => {
    return new Promise((resolve) => {
      const checkStatus = async () => {
        if (signal?.aborted) {
          return { done: true, payload: { status: "aborted" } };
        }

        try {
          const res = await apiRequest(`/movies/${movieId}/episodes/${episodeId}/subtitles/korean/status`, { requiresAuth: false });
          if (res.success) {
            safeSetProcessStatus(prev => ({
              ...prev,
              [cacheIdentity]: { status: res.status, progress: res.progress, error: res.error }
            }));
            
            if (res.status === 'ready' || res.status === 'failed') {
              return { done: true, payload: res };
            }
          }
        } catch (e) {
          return { done: true, payload: { status: 'failed', error: e.message } };
        }

        return { done: false, payload: null };
      };

      const startInterval = () => {
        const interval = setInterval(async () => {
          const result = await checkStatus();
          if (result.done) {
            clearInterval(interval);
            activePollIntervalsRef.current.delete(interval);
            resolve(result.payload);
          }
        }, 5000);
        activePollIntervalsRef.current.add(interval);
      };

      checkStatus().then((result) => {
        if (result.done) {
          resolve(result.payload);
          return;
        }
        startInterval();
      });
    });
  }, [safeSetProcessStatus]);

  const handleBatchGenerate = async () => {
    if (selectedIds.size === 0) return;
    
    setIsProcessing(true);
    abortControllerRef.current = new AbortController();
    
    const itemsToProcess = requests.filter(r => selectedIds.has(r._id));
    
    for (const episode of itemsToProcess) {
      if (abortControllerRef.current.signal.aborted) break;
      
      const movieId = getMovieTargetId(episode);
      const episodeId = getEpisodeTargetId(episode);
      const cacheId = episode._id;
      if (!movieId || !episodeId || !cacheId) {
        continue;
      }
      
      safeSetProcessStatus(prev => ({
        ...prev,
        [cacheId]: { status: 'processing', progress: 0 }
      }));
      
      try {
        const res = await apiRequest(`/movies/${movieId}/episodes/${episodeId}/subtitles/korean/generate`, {
          method: "POST",
          requiresAuth: true
        });
        
        if (res.success) {
          if (res.status !== 'ready') {
            await pollStatus(movieId, episodeId, cacheId, abortControllerRef.current.signal);
          } else {
            safeSetProcessStatus(prev => ({
              ...prev,
              [cacheId]: { status: 'ready', progress: 100 }
            }));
          }
        } else {
          safeSetProcessStatus(prev => ({
            ...prev,
            [cacheId]: { status: 'failed', error: 'API returned false' }
          }));
        }
      } catch (error) {
        safeSetProcessStatus(prev => ({
          ...prev,
          [cacheId]: { status: 'failed', error: error.message }
        }));
      }
    }
    
    if (isMountedRef.current) {
      setIsProcessing(false);
      setSelectedIds(new Set());
      fetchRequests(pagination.page, { silent: true }); // Refresh list
    }
  };

  const handleStop = () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    clearActivePollIntervals();
    setIsProcessing(false);
  };

  return (
    <div className="w-full max-w-6xl mx-auto animate-fade-in pb-10">
      <div className="mb-8 flex items-center justify-between border-b border-white/5 pb-6">
        <div className="flex items-center gap-4">
          <div className="p-3 bg-primaryColor/10 rounded-xl text-primaryColor border border-primaryColor/20">
            <FiMonitor size={28} />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white tracking-tight">Quản Lý Phụ Đề</h1>
            <p className="text-gray-400 text-sm mt-1">
              Danh sách các tập phim được người dùng yêu cầu làm phụ đề Tiếng Hàn.
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
          {isProcessing ? (
            <button
              onClick={handleStop}
              className="flex items-center gap-2 px-4 py-2 bg-red-600/20 hover:bg-red-600/40 text-red-500 rounded-lg transition-colors border border-red-600/30"
            >
              <FiX />
              <span>Dừng lại</span>
            </button>
          ) : (
            <button
              onClick={handleBatchGenerate}
              disabled={selectedIds.size === 0}
              className="flex items-center gap-2 px-4 py-2 bg-primaryColor hover:bg-primaryColor/90 disabled:bg-gray-700 disabled:text-gray-400 text-black font-bold rounded-lg transition-colors"
            >
              <FiPlay />
              <span>Tạo Sub Hàng Loạt ({selectedIds.size})</span>
            </button>
          )}
        </div>
      </div>

      <div className="bg-bgColor2 rounded-xl overflow-hidden border border-white/5">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-black/20 text-gray-400 uppercase text-xs border-b border-white/5">
              <tr>
                <th className="px-6 py-4">
                  <input
                    type="checkbox"
                    checked={requests.length > 0 && selectedIds.size === requests.length}
                    onChange={handleSelectAll}
                    disabled={isProcessing || requests.length === 0}
                    className="rounded border-gray-600 bg-gray-700 text-primaryColor focus:ring-primaryColor"
                  />
                </th>
                <th className="px-6 py-4">Phim / Tập</th>
                <th className="px-6 py-4 text-center">Lượt Yêu Cầu</th>
                <th className="px-6 py-4">Trạng Thái</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {loading ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    <FiLoader className="animate-spin text-2xl mx-auto mb-2" />
                    Đang tải danh sách...
                  </td>
                </tr>
              ) : requests.length === 0 ? (
                <tr>
                  <td colSpan="4" className="px-6 py-12 text-center text-gray-500">
                    Chưa có yêu cầu tạo phụ đề nào.
                  </td>
                </tr>
              ) : (
                requests.map((episode) => {
                  const isSelected = selectedIds.has(episode._id);
                  const pStatus = processStatus[episode._id];
                  
                  return (
                    <tr 
                      key={episode._id}
                      className={`hover:bg-white/5 transition-colors ${isSelected ? 'bg-primaryColor/5' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelect(episode._id)}
                          disabled={isProcessing}
                          className="rounded border-gray-600 bg-gray-700 text-primaryColor focus:ring-primaryColor"
                        />
                      </td>
                      <td className="px-6 py-4 flex items-center gap-3">
                        {episode.movieId?.thumb_url && (
                          <img 
                            src={episode.movieId.thumb_url} 
                            alt={episode.movieId.name} 
                            className="w-10 h-14 object-cover rounded shadow-sm"
                          />
                        )}
                        <div>
                          <p className="font-semibold text-white">{episode.movieId?.title || episode.movieId?.name || "Unknown Movie"}</p>
                          <p className="text-xs text-gray-500 mt-1">
                            Tập {episode.episodeId} | {episode.serverName}
                          </p>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-center">
                        <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-blue-500/10 text-blue-400 font-bold border border-blue-500/20">
                          {episode.subtitleRequestCount}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        {pStatus ? (
                          <div className="flex items-center gap-2">
                            {pStatus.status === 'processing' && (
                              <>
                                <FiLoader className="animate-spin text-yellow-500" />
                                <span className="text-yellow-500">Đang xử lý {pStatus.progress}%</span>
                              </>
                            )}
                            {pStatus.status === 'ready' && (
                              <>
                                <FiCheck className="text-green-500" />
                                <span className="text-green-500">Hoàn thành</span>
                              </>
                            )}
                            {pStatus.status === 'failed' && (
                              <>
                                <FiX className="text-red-500" />
                                <span className="text-red-500" title={pStatus.error}>Thất bại</span>
                              </>
                            )}
                          </div>
                        ) : (
                          <span className="text-gray-500">Chờ xử lý</span>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {!loading && requests.length > 0 && (
        <div className="mt-6 flex justify-center">
          <PaginationV2
            page={pagination.page}
            totalPages={pagination.pages}
            onPageChange={(page) => setPagination(prev => ({ ...prev, page }))}
          />
        </div>
      )}
    </div>
  );
};

export default AdminSubtitlesTab;
