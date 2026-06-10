import {
  getTopRankTier,
  getUserPrestige,
  getPrestigeContainerClassName,
  getAdminPrestigePreview,
  isUserPremiumDisplay,
} from "../userPrestige";

describe("userPrestige", () => {
  it("returns distinct tiers for top three ranks", () => {
    expect(getTopRankTier(1).title).toBe("Quán quân rạp");
    expect(getTopRankTier(2).title).toBe("Á quân bạc");
    expect(getTopRankTier(3).title).toBe("Huy chương đồng");
    expect(getTopRankTier(4)).toBeNull();
  });

  it("treats API premium flag as enough for public leaderboard display", () => {
    expect(isUserPremiumDisplay({ isPremium: true })).toBe(true);
    expect(
      isUserPremiumDisplay({
        role: "premium",
        premiumExpiresAt: new Date(Date.now() + 86400000).toISOString(),
      }),
    ).toBe(true);
    expect(isUserPremiumDisplay({ role: "premium", premiumExpiresAt: "2000-01-01" })).toBe(false);
  });

  it("combines premium and top rank prestige", () => {
    const prestige = getUserPrestige({ isPremium: true }, 1);

    expect(prestige.isPremium).toBe(true);
    expect(prestige.isTopRank).toBe(true);
    expect(prestige.displayTitle).toBe("Quán quân rạp");
    const containerClassName = getPrestigeContainerClassName({ isPremium: true }, 1);

    expect(containerClassName).toContain("border-primaryColor");
    expect(containerClassName).toContain("border-[#ffd875]");
    expect(containerClassName).not.toContain("bg-primaryColor");
  });

  it("allows admin-only prestige preview from query params", () => {
    expect(
      getAdminPrestigePreview(
        { role: "admin" },
        "?tabs=profile&prestigePreviewRank=2&prestigePreviewPremium=1",
      ),
    ).toEqual({
      isActive: true,
      rank: 2,
      isPremium: true,
    });

    expect(getAdminPrestigePreview({ role: "user" }, "?prestigePreviewRank=1")).toEqual({
      isActive: false,
      rank: null,
      isPremium: false,
    });

    expect(getAdminPrestigePreview({ role: "admin" }, "?prestigePreviewRank=9")).toEqual({
      isActive: false,
      rank: null,
      isPremium: false,
    });
  });
});
