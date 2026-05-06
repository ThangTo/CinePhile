import {
  getDynamicOutroWindowSec,
  getEffectiveOutroStartSec,
  normalizePlaybackMeta,
  shouldShowNextEpisodePrompt,
} from "../playbackTiming";

describe("playbackTiming", () => {
  it("normalizes intro and custom outro metadata", () => {
    expect(
      normalizePlaybackMeta({
        introStartSec: 1,
        introEndSec: 40,
        outroStartSec: 1200,
      }),
    ).toEqual({
      intro: { startSec: 1, endSec: 40 },
      outro: { startSec: 1200 },
    });
  });

  it("uses a dynamic outro window clamped between 45 and 180 seconds", () => {
    expect(getDynamicOutroWindowSec(600)).toBe(45);
    expect(getDynamicOutroWindowSec(1200)).toBe(60);
    expect(getDynamicOutroWindowSec(2700)).toBe(135);
    expect(getDynamicOutroWindowSec(5400)).toBe(180);
  });

  it("prefers admin custom outro before falling back to dynamic timing", () => {
    expect(getEffectiveOutroStartSec({ outro: { startSec: 1000 } }, 2700)).toBe(1000);
    expect(getEffectiveOutroStartSec({ outro: { startSec: 9999 } }, 2700)).toBe(2565);
    expect(getEffectiveOutroStartSec({}, 1200)).toBe(1140);
  });

  it("shows next episode prompt only for playable non-final episodes at the effective outro", () => {
    expect(
      shouldShowNextEpisodePrompt({
        hasNativePlayer: true,
        hasNextEpisode: true,
        duration: 1200,
        currentTime: 1140,
        nextEpisodeCountdown: null,
        playbackMeta: {},
      }),
    ).toBe(true);

    expect(
      shouldShowNextEpisodePrompt({
        hasNativePlayer: true,
        hasNextEpisode: false,
        duration: 1200,
        currentTime: 1190,
        nextEpisodeCountdown: null,
        playbackMeta: {},
      }),
    ).toBe(false);
  });
});
