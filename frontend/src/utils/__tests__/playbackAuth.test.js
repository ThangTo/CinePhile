import { addAutoplayToEmbedSource, shouldBlockPlaybackForAuth } from "../playbackAuth";

describe("playbackAuth", () => {
  it("blocks playback while auth status is loading", () => {
    expect(
      shouldBlockPlaybackForAuth({
        isAuthenticated: false,
        isAuthLoading: true,
      }),
    ).toBe(true);
  });

  it("blocks playback for guests after auth status resolves", () => {
    expect(
      shouldBlockPlaybackForAuth({
        isAuthenticated: false,
        isAuthLoading: false,
      }),
    ).toBe(true);
  });

  it("allows playback for authenticated users", () => {
    expect(
      shouldBlockPlaybackForAuth({
        isAuthenticated: true,
        isAuthLoading: false,
      }),
    ).toBe(false);
  });

  it("adds autoplay to embed URLs without dropping existing parameters", () => {
    const source = addAutoplayToEmbedSource("https://www.youtube.com/embed/abc123?rel=0");
    const url = new URL(source);

    expect(url.searchParams.get("rel")).toBe("0");
    expect(url.searchParams.get("autoplay")).toBe("1");
  });
});
