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
});
