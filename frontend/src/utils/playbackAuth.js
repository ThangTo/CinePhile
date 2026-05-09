export function shouldBlockPlaybackForAuth({ isAuthenticated, isAuthLoading }) {
  return Boolean(isAuthLoading || !isAuthenticated);
}

export function addAutoplayToEmbedSource(source) {
  if (!source) return source;

  try {
    const isRelative =
      !/^[a-z][a-z\d+.-]*:/i.test(source) && !source.startsWith("//");
    const base =
      typeof window !== "undefined" && window.location?.origin
        ? window.location.origin
        : "http://localhost";
    const url = new URL(source, base);
    url.searchParams.set("autoplay", "1");

    if (isRelative) {
      return `${url.pathname}${url.search}${url.hash}`;
    }

    return url.toString();
  } catch {
    const separator = source.includes("?") ? "&" : "?";
    return `${source}${separator}autoplay=1`;
  }
}
