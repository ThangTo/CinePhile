import { getClaimAllAvailability } from "../questPage.helpers";

describe("getClaimAllAvailability", () => {
  it("returns claimable quest ids and bonus availability for current group", () => {
    const result = getClaimAllAvailability({
      quests: [
        { questId: "q1", canClaim: true },
        { questId: "q2", canClaim: false },
        { questId: "q3", canClaim: true },
      ],
      canClaimCompletionBonus: true,
    });

    expect(result).toEqual({
      claimableQuestIds: ["q1", "q3"],
      canClaimBonus: true,
      hasAnyClaimableReward: true,
    });
  });

  it("returns no available rewards when nothing can be claimed", () => {
    const result = getClaimAllAvailability({
      quests: [
        { questId: "q1", canClaim: false },
      ],
      canClaimCompletionBonus: false,
    });

    expect(result).toEqual({
      claimableQuestIds: [],
      canClaimBonus: false,
      hasAnyClaimableReward: false,
    });
  });
});
