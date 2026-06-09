/* eslint-disable no-restricted-globals */
import { clientsClaim } from "workbox-core";
import { ExpirationPlugin } from "workbox-expiration";
import { createHandlerBoundToURL, precacheAndRoute } from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";
import { CacheFirst, NetworkOnly, StaleWhileRevalidate } from "workbox-strategies";

clientsClaim();

precacheAndRoute(self.__WB_MANIFEST);

const publicUrl = process.env.PUBLIC_URL || "";
const appShellHandler = createHandlerBoundToURL(`${publicUrl}/index.html`);

registerRoute(
  new NavigationRoute(appShellHandler, {
    denylist: [/^\/_/, /\/[^/?]+\.[^/]+$/],
  }),
);

const isStreamingRequest = ({ request, url }) => {
  const pathname = url.pathname.toLowerCase();

  return (
    request.destination === "video" ||
    pathname.includes("proxy-m3u8") ||
    pathname.includes("proxy-ts") ||
    pathname.endsWith(".m3u8") ||
    pathname.endsWith(".m4s") ||
    pathname.endsWith(".mp4") ||
    pathname.endsWith(".ts")
  );
};

registerRoute(isStreamingRequest, new NetworkOnly(), "GET");

registerRoute(
  ({ request, url }) => url.origin === self.location.origin && request.destination === "image",
  new CacheFirst({
    cacheName: "cinephine-static-images-v1",
    plugins: [
      new ExpirationPlugin({
        maxEntries: 60,
        maxAgeSeconds: 30 * 24 * 60 * 60,
      }),
    ],
  }),
  "GET",
);

registerRoute(
  ({ request, url }) =>
    url.origin === self.location.origin &&
    ["font", "script", "style", "worker"].includes(request.destination),
  new StaleWhileRevalidate({
    cacheName: "cinephine-static-assets-v1",
  }),
  "GET",
);

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    self.skipWaiting();
  }
});
