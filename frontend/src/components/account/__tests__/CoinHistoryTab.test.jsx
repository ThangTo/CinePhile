import { render, screen, waitFor } from "@testing-library/react";

jest.mock("hooks/useAuth", () => jest.fn(), { virtual: true });
jest.mock("services/user.service", () => ({
  __esModule: true,
  default: {
    getCoinHistory: jest.fn(),
  },
}), { virtual: true });

const useAuth = require("hooks/useAuth");
const userService = require("services/user.service").default;
const CoinHistoryTab = require("../CoinHistoryTab").default;

describe("CoinHistoryTab", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({
      user: { coin: 120 },
    });
    userService.getCoinHistory.mockResolvedValue({
      entries: [
        {
          _id: "entry-1",
          reason: "quest_reward",
          delta: 10,
          balanceBefore: 100,
          balanceAfter: 110,
          note: "Daily quest reward",
          createdAt: "2026-04-06T08:00:00.000Z",
        },
        {
          _id: "entry-2",
          reason: "premium_upgrade",
          delta: -30,
          balanceBefore: 150,
          balanceAfter: 120,
          note: "Upgrade monthly premium",
          createdAt: "2026-04-06T09:00:00.000Z",
        },
      ],
      total: 2,
      totalPages: 1,
      page: 1,
      limit: 20,
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it("renders coin ledger entries with before and after balances", async () => {
    render(<CoinHistoryTab />);

    await waitFor(() => {
      expect(userService.getCoinHistory).toHaveBeenCalledTimes(1);
    });

    expect(await screen.findByText(/Daily quest reward/i)).toBeTruthy();
    expect(await screen.findByText(/Upgrade monthly premium/i)).toBeTruthy();
    expect(screen.getAllByText(/\+10/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/-30/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/100/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/110/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/150/).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/120/).length).toBeGreaterThan(0);
  });
});
