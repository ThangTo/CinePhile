import {
  countUniqueEpisodes,
  findEpisodeVariant,
  pickPreferredAudioType,
} from "../episodeSelection";

const residentPlaybookEpisodes = [
  {
    id: "tm-1",
    episode: 1,
    audioType: "thuyet-minh",
    link_m3u8: "https://s4.phim1280.tv/20250416/nyBart6T/index.m3u8",
  },
  {
    id: "vs-1",
    episode: 1,
    audioType: "vietsub",
    link_m3u8: "https://s4.phim1280.tv/20250412/ECV3Lny9/index.m3u8",
  },
  {
    id: "tm-2",
    episode: 2,
    audioType: "thuyet-minh",
    link_m3u8: "https://s4.phim1280.tv/20250416/3Mutcdwu/index.m3u8",
  },
];

describe("episodeSelection", () => {
  it("selects the requested audio variant for the active episode", () => {
    const selected = findEpisodeVariant(residentPlaybookEpisodes, 1, "vietsub");

    expect(selected).toEqual(
      expect.objectContaining({
        id: "vs-1",
        audioType: "vietsub",
        link_m3u8: "https://s4.phim1280.tv/20250412/ECV3Lny9/index.m3u8",
      }),
    );
  });

  it("falls back to the same episode when the requested audio variant is missing", () => {
    const selected = findEpisodeVariant(residentPlaybookEpisodes, 2, "vietsub");

    expect(selected).toEqual(
      expect.objectContaining({
        id: "tm-2",
        episode: 2,
      }),
    );
  });

  it("falls back to episode 1 with the requested audio when the active episode is missing", () => {
    const selected = findEpisodeVariant(residentPlaybookEpisodes, 99, "vietsub");

    expect(selected).toEqual(
      expect.objectContaining({
        id: "vs-1",
        episode: 1,
        audioType: "vietsub",
      }),
    );
  });

  it("counts episode numbers once even when each episode has multiple audio variants", () => {
    expect(countUniqueEpisodes(residentPlaybookEpisodes)).toBe(2);
  });

  it("prefers vietsub as the default audio when multiple variants exist", () => {
    expect(pickPreferredAudioType(residentPlaybookEpisodes)).toBe("vietsub");
  });
});
