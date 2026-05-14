import apiRequest from "services/utils/apiRequest";
import { playbackAPI } from "services/admin.service";

jest.mock("services/utils/apiRequest", () => jest.fn());

describe("playbackAPI", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it("keeps the detect intro job id when the response also has job data", async () => {
    apiRequest.mockResolvedValue({
      success: true,
      jobId: "job-123",
      state: "waiting",
      backend: "bull",
      data: {
        movieId: "movie-1",
        options: { sampleSize: 5 },
      },
    });

    const result = await playbackAPI.detectIntro({ movieId: "movie-1" });

    expect(result.jobId).toBe("job-123");
    expect(result.backend).toBe("bull");
    expect(result.data.movieId).toBe("movie-1");
  });

  it("requests the latest intro batch report from the admin playback API", async () => {
    apiRequest.mockResolvedValue({
      data: {
        success: true,
        batch: { batchId: "intro-batch-1" },
      },
    });

    const result = await playbackAPI.getIntroBatchLatest();

    expect(apiRequest).toHaveBeenCalledWith("/admin/playback/intro-batches/latest", {
      requiresAuth: true,
    });
    expect(result.batch.batchId).toBe("intro-batch-1");
  });

  it("requests the upcoming intro batch preview from the admin playback API", async () => {
    apiRequest.mockResolvedValue({
      data: {
        success: true,
        preview: {
          nextRunAt: "2026-05-15T04:00:00.000+07:00",
          movies: [{ movieId: "movie-1", movieName: "Series" }],
        },
      },
    });

    const result = await playbackAPI.getIntroBatchPreview({ limit: 30 });

    expect(apiRequest).toHaveBeenCalledWith("/admin/playback/intro-batches/preview", {
      params: { limit: 30 },
      requiresAuth: true,
    });
    expect(result.preview.movies).toHaveLength(1);
  });
});
