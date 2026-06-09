import { render, waitFor } from "@testing-library/react";

jest.mock("hooks/useAuth", () => jest.fn(), { virtual: true });
jest.mock("services/user.service", () => ({
  __esModule: true,
  default: {
    getStreak: jest.fn(),
  },
}), { virtual: true });
jest.mock("react-router-dom", () => ({
  useNavigate: () => jest.fn(),
}), { virtual: true });

const useAuth = require("hooks/useAuth");
const userService = require("services/user.service").default;
const WatchStreak = require("../WatchStreak").default;

describe("WatchStreak", () => {
  beforeEach(() => {
    useAuth.mockReturnValue({ isAuthenticated: true });
    userService.getStreak.mockResolvedValue({
      currentStreak: 3,
      longestStreak: 5,
      isActiveToday: true,
      todayProgress: 10,
      lastQualifiedWatchDate: new Date().toISOString(),
    });
    global.fetch = jest.fn();
  });

  afterEach(() => {
    jest.clearAllMocks();
    delete global.fetch;
  });

  it("loads streak data through the shared auth-aware user service", async () => {
    render(<WatchStreak compact />);

    await waitFor(() => {
      expect(userService.getStreak).toHaveBeenCalledTimes(1);
    });

    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("highlights every qualified streak day visible in the current week", async () => {
    const { container } = render(<WatchStreak />);

    await waitFor(() => {
      expect(userService.getStreak).toHaveBeenCalledTimes(1);
    });

    const currentWeekDay = (new Date().getDay() + 6) % 7;
    const visibleStreakDays = Math.min(3, currentWeekDay + 1);

    expect(container.querySelectorAll('[data-streak-qualified="true"]')).toHaveLength(
      visibleStreakDays,
    );
  });
});
