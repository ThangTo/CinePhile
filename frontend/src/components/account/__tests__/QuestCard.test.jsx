import { render, screen, fireEvent } from "@testing-library/react";
import QuestCard from "../QuestCard";

describe("QuestCard", () => {
  it('renders "Di ngay" button and calls onGoNow when clicked', () => {
    const handleGoNow = jest.fn();

    render(
      <QuestCard
        quest={{
          questId: "quest-1",
          title: "Xem phim 10 phut",
          description: "Xem phim de nhan coin",
          icon: "fa-solid fa-play",
          targetMetric: "watch_seconds",
          targetValue: 600,
          currentValue: 120,
          isCompleted: false,
          isClaimed: false,
          rewardCoins: 10,
          canClaim: false,
        }}
        onClaim={jest.fn()}
        onGoNow={handleGoNow}
      />
    );

    fireEvent.click(screen.getByRole("button", { name: /di ngay/i }));

    expect(handleGoNow).toHaveBeenCalledTimes(1);
  });

  it('does not render "Di ngay" when quest is completed and can claim coin', () => {
    render(
      <QuestCard
        quest={{
          questId: "quest-2",
          title: "Binh luan 1 phim",
          description: "Da hoan thanh",
          icon: "fa-solid fa-comment",
          targetMetric: "comment_count",
          targetValue: 1,
          currentValue: 1,
          isCompleted: true,
          isClaimed: false,
          rewardCoins: 10,
          canClaim: true,
        }}
        onClaim={jest.fn()}
        onGoNow={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /di ngay/i })).toBeNull();
  });

  it('does not render "Di ngay" when quest reward was already claimed', () => {
    render(
      <QuestCard
        quest={{
          questId: "quest-3",
          title: "Them vao yeu thich",
          description: "Da nhan thuong",
          icon: "fa-solid fa-heart",
          targetMetric: "favorite_count",
          targetValue: 1,
          currentValue: 1,
          isCompleted: true,
          isClaimed: true,
          rewardCoins: 10,
          canClaim: false,
        }}
        onClaim={jest.fn()}
        onGoNow={jest.fn()}
      />
    );

    expect(screen.queryByRole("button", { name: /di ngay/i })).toBeNull();
  });
});
