const EMAIL_PATTERN =
  /^[a-z0-9!#$%&'*+/=?^_`{|}~.-]+@[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?(?:\.[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?)+$/i;

export const normalizeEmail = (email = "") => email.trim().toLowerCase();

export const isValidEmail = (email) => {
  const normalizedEmail = normalizeEmail(email);
  if (!normalizedEmail || normalizedEmail.length > 254) return false;

  const [localPart, domain, ...extraParts] = normalizedEmail.split("@");
  if (!localPart || !domain || extraParts.length > 0 || localPart.length > 64) return false;
  if (localPart.startsWith(".") || localPart.endsWith(".") || localPart.includes("..")) {
    return false;
  }

  const domainParts = domain.split(".");
  const topLevelDomain = domainParts[domainParts.length - 1];

  return /^[a-z]{2,63}$/i.test(topLevelDomain) && EMAIL_PATTERN.test(normalizedEmail);
};
