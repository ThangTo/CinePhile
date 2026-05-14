import { createPlaybackHeartbeatAccumulator } from "../playbackHeartbeat";

const makeClock = () => {
  let nowMs = 0;
  return {
    now: () => nowMs,
    advance: (seconds) => {
      nowMs += seconds * 1000;
    },
  };
};

const makeVideo = () => ({
  currentTime: 0,
  playbackRate: 1,
});

describe("playbackHeartbeat", () => {
  it("counts delayed timer ticks by elapsed playback time instead of one second", () => {
    const clock = makeClock();
    const video = makeVideo();
    const accumulator = createPlaybackHeartbeatAccumulator({ now: clock.now });

    accumulator.reset(video);
    clock.advance(180);
    video.currentTime = 180;

    expect(accumulator.collect(video)).toBe(180);
  });

  it("normalizes faster playback rate back to real watched seconds", () => {
    const clock = makeClock();
    const video = makeVideo();
    video.playbackRate = 2;
    const accumulator = createPlaybackHeartbeatAccumulator({ now: clock.now });

    accumulator.reset(video);
    clock.advance(60);
    video.currentTime = 120;

    expect(accumulator.collect(video)).toBe(60);
  });

  it("does not count seek jumps as watched time", () => {
    const clock = makeClock();
    const video = makeVideo();
    const accumulator = createPlaybackHeartbeatAccumulator({ now: clock.now });

    accumulator.reset(video);
    clock.advance(5);
    video.currentTime = 900;

    expect(accumulator.collect(video)).toBe(5);
  });

  it("accumulates a two hour session exactly when playback and wall time match", () => {
    const clock = makeClock();
    const video = makeVideo();
    const accumulator = createPlaybackHeartbeatAccumulator({ now: clock.now });
    const chunks = [60, 92, 180, 300, 75, 244, 60, 299, 121, 300];
    let total = 0;
    let collected = 0;
    let index = 0;

    accumulator.reset(video);
    while (total < 7200) {
      const next = Math.min(chunks[index % chunks.length], 7200 - total);
      clock.advance(next);
      video.currentTime += next;
      total += next;
      collected += accumulator.collect(video);
      index += 1;
    }

    expect(collected).toBe(7200);
  });
});
