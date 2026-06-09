import { isValidEmail, normalizeEmail } from "../emailUtils";

describe("emailUtils", () => {
  it("normalizes valid email addresses", () => {
    expect(normalizeEmail("  User.Name@Example.COM ")).toBe("user.name@example.com");
    expect(isValidEmail("  User.Name@Example.COM ")).toBe(true);
  });

  it.each([
    "plainaddress",
    "@example.com",
    "user@",
    "user@example",
    "user@example.c",
    "user@example.123",
    "user..name@example.com",
    ".user@example.com",
    "user.@example.com",
    "user@example..com",
    "user@-example.com",
    "user@example-.com",
  ])("rejects malformed email %s", (email) => {
    expect(isValidEmail(email)).toBe(false);
  });
});
