import {
  getPremiumSummary,
  getPremiumStatusText,
  getRemainingDays,
  isPremiumActive,
} from "../premiumUtils";

describe("premiumUtils", () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.setSystemTime(new Date("2026-06-10T00:00:00.000Z"));
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it("requires a future expiry date for premium to be active", () => {
    expect(
      isPremiumActive({
        role: "premium",
        premiumExpiresAt: "2026-06-11T00:00:00.000Z",
      }),
    ).toBe(true);

    expect(isPremiumActive({ role: "premium", premiumExpiresAt: null })).toBe(false);
    expect(isPremiumActive({ role: "premium" })).toBe(false);
    expect(
      isPremiumActive({
        role: "premium",
        premiumExpiresAt: "2026-06-09T00:00:00.000Z",
      }),
    ).toBe(false);
  });

  it("returns zero remaining days for expired or missing-expiry premium users", () => {
    expect(getRemainingDays({ role: "premium", premiumExpiresAt: null })).toBe(0);
    expect(
      getRemainingDays({
        role: "premium",
        premiumExpiresAt: "2026-06-09T00:00:00.000Z",
      }),
    ).toBe(0);
  });

  it("formats active premium status without treating missing expiry as permanent", () => {
    expect(
      getPremiumStatusText({
        role: "premium",
        premiumPlan: "monthly",
        premiumExpiresAt: "2026-06-17T00:00:00.000Z",
      }),
    ).toContain("7 ngày");

    expect(getPremiumStatusText({ role: "premium", premiumPlan: "monthly" })).toBe("");
  });

  it("builds a detailed premium summary for account UI", () => {
    const summary = getPremiumSummary({
      role: "premium",
      premiumPlan: "monthly",
      premiumExpiresAt: "2026-06-17T12:00:00.000Z",
    });

    expect(summary).toMatchObject({
      isActive: true,
      planKey: "monthly",
      planName: "Tháng",
      remainingDays: 8,
      expiresAtLabel: "17/06/2026",
      title: "Premium Tháng",
      statusText: "Premium Tháng 8 ngày",
      compactText: "Gói Tháng • còn 8 ngày",
    });
  });

  it("builds an inactive premium summary when the user has no active plan", () => {
    expect(getPremiumSummary({ role: "user" })).toMatchObject({
      isActive: false,
      planKey: null,
      planName: "",
      remainingDays: 0,
      expiresAt: null,
      expiresAtLabel: "",
      title: "Thành viên thường",
      statusText: "",
      compactText: "Thành viên thường",
    });
  });
});
