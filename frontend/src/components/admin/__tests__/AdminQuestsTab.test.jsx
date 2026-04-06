import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import AdminQuestsTab from "../AdminQuestsTab";
import { questAdminAPI } from "services/admin.service";

jest.mock("services/admin.service", () => ({
  questAdminAPI: {
    getConfig: jest.fn(),
    updateConfig: jest.fn(),
    upsertTemplate: jest.fn(),
    archiveTemplate: jest.fn(),
  },
}));

const mockResponse = {
  currentSnapshot: {
    daily: {
      type: "daily",
      periodKey: "2026-04-06",
      selectionMode: "fixed",
      completionBonusCoins: 50,
      quests: [
        {
          sourceQuestDefinitionId: "d1",
          title: "Watch 10 minutes",
          targetMetric: "watch_seconds",
          targetInputValue: 10,
          rewardCoins: 10,
        },
      ],
    },
    weekly: {
      type: "weekly",
      periodKey: "2026-W15",
      selectionMode: "fixed",
      completionBonusCoins: 100,
      quests: [],
    },
  },
  draftConfig: {
    daily: {
      type: "daily",
      selectionMode: "fixed",
      fixedQuestIds: ["d1"],
      randomPoolQuestIds: ["d1", "d2"],
      randomCount: 1,
      completionBonusCoins: 50,
    },
    weekly: {
      type: "weekly",
      selectionMode: "fixed",
      fixedQuestIds: [],
      randomPoolQuestIds: [],
      randomCount: 0,
      completionBonusCoins: 100,
    },
  },
  nextPeriodKey: {
    daily: "2026-04-07",
    weekly: "2026-W16",
  },
  nextPreview: {
    daily: {
      type: "daily",
      periodKey: "2026-04-07",
      selectionMode: "fixed",
      completionBonusCoins: 50,
      quests: [
        {
          sourceQuestDefinitionId: "d1",
          title: "Watch 10 minutes",
          targetMetric: "watch_seconds",
          targetInputValue: 10,
          rewardCoins: 10,
        },
      ],
    },
    weekly: {
      type: "weekly",
      periodKey: "2026-W16",
      selectionMode: "fixed",
      completionBonusCoins: 100,
      quests: [],
    },
  },
  templates: {
    daily: [
      {
        id: "d1",
        title: "Watch 10 minutes",
        icon: "fa-solid fa-play",
        targetMetric: "watch_seconds",
        targetInputValue: 10,
        rewardCoins: 10,
        order: 1,
      },
      {
        id: "d2",
        title: "Comment once",
        icon: "fa-solid fa-comment",
        targetMetric: "comment_count",
        targetInputValue: 1,
        rewardCoins: 20,
        order: 2,
      },
    ],
    weekly: [],
  },
};

describe("AdminQuestsTab", () => {
  beforeEach(() => {
    jest.clearAllMocks();
    questAdminAPI.getConfig.mockResolvedValue(mockResponse);
    questAdminAPI.updateConfig.mockResolvedValue({
      config: mockResponse.draftConfig.daily,
      nextPeriodKey: mockResponse.nextPeriodKey.daily,
      nextPreview: mockResponse.nextPreview.daily,
    });
  });

  it("renders current snapshot and next preview data", async () => {
    render(<AdminQuestsTab />);

    expect(await screen.findByText(/Quan ly nhiem vu/i)).not.toBeNull();
    expect(screen.getAllByText(/Watch 10 minutes/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Period key: 2026-04-07/i)).not.toBeNull();
  });

  it("allows switching a daily draft to random mode and saving it", async () => {
    render(<AdminQuestsTab />);

    const dailySection = (await screen.findByText("Daily")).closest("section");
    expect(dailySection).not.toBeNull();

    fireEvent.click(within(dailySection).getByRole("button", { name: "Random" }));

    expect(within(dailySection).getByText(/Pool random ky sau/i)).not.toBeNull();

    fireEvent.click(within(dailySection).getByRole("button", { name: /Luu nhap/i }));

    await waitFor(() =>
      expect(questAdminAPI.updateConfig).toHaveBeenCalledWith(
        "daily",
        expect.objectContaining({ selectionMode: "random" }),
      ),
    );
  });
});
