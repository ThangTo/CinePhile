import { findEpisodeVariant } from "./episodeSelection";

describe("findEpisodeVariant", () => {
  const fullMovieVariants = [
    {
      episode: 0,
      audioType: "thuyet-minh",
      link_m3u8: "https://example.com/thuyet-minh.m3u8",
    },
    {
      episode: 0,
      audioType: "vietsub",
      link_m3u8: "https://example.com/vietsub.m3u8",
    },
  ];

  it("matches the requested audio variant for legacy full movies stored as episode 0", () => {
    expect(findEpisodeVariant(fullMovieVariants, 1, "vietsub")).toMatchObject({
      audioType: "vietsub",
      link_m3u8: "https://example.com/vietsub.m3u8",
    });
  });

  it("does not force full-movie aliases when a real episode 1 variant exists", () => {
    const episodes = [
      ...fullMovieVariants,
      {
        episode: 1,
        audioType: "vietsub",
        link_m3u8: "https://example.com/real-episode-1.m3u8",
      },
    ];

    expect(findEpisodeVariant(episodes, 1, "vietsub")).toMatchObject({
      episode: 1,
      link_m3u8: "https://example.com/real-episode-1.m3u8",
    });
  });
});
