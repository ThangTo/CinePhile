import {
  buildAdminPreviewSource,
  getIntroPreviewRange,
} from "../AdminPlaybackTab";

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
  },
}));

describe("AdminPlaybackTab preview helpers", () => {
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
});
