import {
  render,
  screen,
  fireEvent,
  waitFor,
  act,
} from "@testing-library/react";
import AdminPlaybackTab, {
  buildAdminPreviewSource,
  getIntroPreviewRange,
} from "../AdminPlaybackTab";
import { playbackAPI } from "services/admin.service";

jest.mock("hls.js", () => ({
  __esModule: true,
  default: class MockHls {
    static isSupported() {
      return true;
    }

    static Events = { MANIFEST_PARSED: "manifestParsed" };

    loadSource() {}

    attachMedia() {}

    on() {}

    destroy() {}
  },
}));

jest.mock("services/admin.service", () => ({
  playbackAPI: {
    getEpisodes: jest.fn(),
    updateEpisode: jest.fn(),
    detectIntro: jest.fn(),
    getDetectionStatus: jest.fn(),
    getIntroBatchLatest: jest.fn(),
  },
}));

describe("AdminPlaybackTab preview helpers", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    playbackAPI.getIntroBatchLatest.mockResolvedValue({ batch: null });
  });

  it("builds preview source through backend proxy using direct segment mode", () => {
    const source = buildAdminPreviewSource(
      "https://media.example.test/video/master.m3u8",
      "http://localhost:5000/api/v1",
    );

    const url = new URL(source);
    expect(url.pathname).toBe("/api/v1/movies/proxy-m3u8");
    expect(url.searchParams.get("url")).toBe("https://media.example.test/video/master.m3u8");
    expect(url.searchParams.get("mode")).toBe("direct");
  });

  it("returns a preview range only when intro start and end are valid", () => {
    expect(getIntroPreviewRange({ introStartSec: "1", introEndSec: "40" })).toEqual({
      startSec: 1,
      endSec: 40,
    });
    expect(getIntroPreviewRange({ introStartSec: "40", introEndSec: "1" })).toBeNull();
    expect(getIntroPreviewRange({ introStartSec: "", introEndSec: "40" })).toBeNull();
  });

  it("debounces admin playback search requests", async () => {
    jest.useFakeTimers();
    try {
      playbackAPI.getEpisodes.mockResolvedValue({
        data: [],
        pagination: { page: 1, limit: 25, total: 0, totalPages: 0 },
      });

      await act(async () => {
        render(<AdminPlaybackTab />);
        await Promise.resolve();
      });
      await waitFor(() => expect(playbackAPI.getEpisodes).toHaveBeenCalledTimes(1));

      fireEvent.change(screen.getByPlaceholderText(/Tìm tên phim/i), {
        target: { value: "d" },
      });
      fireEvent.change(screen.getByPlaceholderText(/Tìm tên phim/i), {
        target: { value: "dai chien" },
      });

      expect(playbackAPI.getEpisodes).toHaveBeenCalledTimes(1);

      await act(async () => {
        jest.advanceTimersByTime(450);
        await Promise.resolve();
      });

      await waitFor(() => expect(playbackAPI.getEpisodes).toHaveBeenCalledTimes(2));
      expect(playbackAPI.getEpisodes).toHaveBeenLastCalledWith({
        page: 1,
        limit: 25,
        search: "dai chien",
        status: "all",
      });
    } finally {
      jest.useRealTimers();
    }
  });

  it("refreshes blank intro drafts from server metadata after a completed detect job", async () => {
    const emptyEpisode = {
      id: "episode-1",
      episode: 1,
      link_m3u8: "https://media.example.test/video/master.m3u8",
      movie: { id: "movie-1", name: "Đại Chiến Người Khổng Lồ" },
      playbackMeta: {
        introStartSec: null,
        introEndSec: null,
        outroStartSec: null,
        detectionStatus: "none",
        detectionSource: "none",
        confidence: 0,
      },
    };
    const detectedEpisode = {
      ...emptyEpisode,
      playbackMeta: {
        ...emptyEpisode.playbackMeta,
        introStartSec: 42,
        introEndSec: 101,
        detectionStatus: "detected",
        detectionSource: "auto",
        confidence: 0.93,
        detectionNote: "Matched 4 episode pairs",
      },
    };

    playbackAPI.getEpisodes
      .mockResolvedValueOnce({
        data: [emptyEpisode],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      })
      .mockResolvedValueOnce({
        data: [detectedEpisode],
        pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
      });
    playbackAPI.detectIntro.mockResolvedValue({
      jobId: "job-1",
      state: "waiting",
      backend: "memory",
    });
    playbackAPI.getDetectionStatus.mockResolvedValue({
      job: {
        id: "job-1",
        state: "completed",
        progress: 100,
        result: { detectedEpisodes: 1, inferredEpisodes: 0 },
      },
    });

    await act(async () => {
      render(<AdminPlaybackTab />);
      await Promise.resolve();
    });
    await waitFor(() => expect(playbackAPI.getEpisodes).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTitle(/Intro/i));
    fireEvent.click(screen.getByLabelText("Bắt đầu detect intro"));

    await waitFor(() => expect(playbackAPI.getEpisodes).toHaveBeenCalledTimes(2));
    expect(screen.getByDisplayValue("42")).toBeTruthy();
    expect(screen.getByDisplayValue("101")).toBeTruthy();
  });

  it("sends configurable remaining-episode detect options from the admin modal", async () => {
    const episode = {
      id: "episode-1",
      episode: 1,
      link_m3u8: "https://media.example.test/video/master.m3u8",
      movie: { id: "movie-1", name: "Đại Chiến Người Khổng Lồ" },
      playbackMeta: {
        introStartSec: null,
        introEndSec: null,
        outroStartSec: null,
        detectionStatus: "none",
        detectionSource: "none",
        confidence: 0,
      },
    };

    playbackAPI.getEpisodes.mockResolvedValue({
      data: [episode],
      pagination: { page: 1, limit: 25, total: 1, totalPages: 1 },
    });
    playbackAPI.detectIntro.mockResolvedValue({
      jobId: "job-remaining",
      state: "waiting",
      backend: "memory",
    });

    await act(async () => {
      render(<AdminPlaybackTab />);
      await Promise.resolve();
    });
    await waitFor(() => expect(playbackAPI.getEpisodes).toHaveBeenCalledTimes(1));

    fireEvent.click(screen.getByTitle(/Intro/i));
    fireEvent.click(screen.getByLabelText("Chọn chế độ remaining"));
    fireEvent.click(screen.getByLabelText("Chọn thời gian detect 900 giây"));
    fireEvent.change(screen.getByLabelText("Số tập detect"), {
      target: { value: "7" },
    });
    fireEvent.click(screen.getByLabelText("Bắt đầu detect intro"));

    await waitFor(() => expect(playbackAPI.detectIntro).toHaveBeenCalledTimes(1));
    expect(playbackAPI.detectIntro).toHaveBeenCalledWith({
      movieId: "movie-1",
      sampleSeconds: 900,
      episodeSelectionMode: "remaining",
      maxEpisodesPerJob: 500,
      applySeasonDefault: false,
      sampleSize: 7,
    });
  });
});
