export const getClaimAllAvailability = (group) => {
  const claimableQuestIds = Array.isArray(group?.quests)
    ? group.quests.filter((quest) => quest.canClaim).map((quest) => quest.questId)
    : [];
  const canClaimBonus = Boolean(group?.canClaimCompletionBonus);

  return {
    claimableQuestIds,
    canClaimBonus,
    hasAnyClaimableReward: claimableQuestIds.length > 0 || canClaimBonus,
  };
};
