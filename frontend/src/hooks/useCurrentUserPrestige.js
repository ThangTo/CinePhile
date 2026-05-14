import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import leaderboardService from "services/leaderboard.service";
import { isPremiumActive } from "utils/premiumUtils";
import { getAdminPrestigePreview, getUserPrestige } from "utils/userPrestige";

const getUserIdentity = (value) => value?.id || value?._id;

const useCurrentUserPrestige = (user) => {
  const location = useLocation();
  const [leaderboardRank, setLeaderboardRank] = useState(null);
  const [leaderboardEntry, setLeaderboardEntry] = useState(null);
  const currentUserId = getUserIdentity(user);
  const preview = useMemo(
    () => getAdminPrestigePreview(user, location.search),
    [location.search, user]
  );

  useEffect(() => {
    if (preview.isActive) {
      setLeaderboardRank(preview.rank);
      setLeaderboardEntry(preview.isPremium ? { isPremium: true } : null);
      return undefined;
    }

    if (!currentUserId) {
      setLeaderboardRank(null);
      setLeaderboardEntry(null);
      return undefined;
    }

    let isActive = true;

    leaderboardService
      .getTopUsersLeaderboard()
      .then((rows) => {
        if (!isActive) return;

        const leaderboardRows = Array.isArray(rows) ? rows : [];
        const index = leaderboardRows.findIndex(
          (entry) => String(getUserIdentity(entry)) === String(currentUserId)
        );

        if (index === -1) {
          setLeaderboardRank(null);
          setLeaderboardEntry(null);
          return;
        }

        setLeaderboardRank(index + 1);
        setLeaderboardEntry(leaderboardRows[index]);
      })
      .catch((error) => {
        console.error("[useCurrentUserPrestige] Failed to load leaderboard prestige", error);
        if (!isActive) return;
        setLeaderboardRank(null);
        setLeaderboardEntry(null);
      });

    return () => {
      isActive = false;
    };
  }, [currentUserId, preview.isActive, preview.isPremium, preview.rank]);

  const premiumActive = isPremiumActive(user);
  const displayUser = useMemo(() => {
    if (!user) return null;

    return {
      ...user,
      isPremium: premiumActive || leaderboardEntry?.isPremium === true,
    };
  }, [leaderboardEntry?.isPremium, premiumActive, user]);

  const prestige = useMemo(
    () => getUserPrestige(displayUser, leaderboardRank),
    [displayUser, leaderboardRank]
  );

  return {
    leaderboardRank,
    leaderboardEntry,
    displayUser,
    prestige,
    isPremium: prestige.isPremium,
    isPreview: preview.isActive,
  };
};

export default useCurrentUserPrestige;
