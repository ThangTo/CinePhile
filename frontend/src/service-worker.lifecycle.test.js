jest.mock("workbox-core", () => ({
  clientsClaim: jest.fn(),
}));

jest.mock("workbox-expiration", () => ({
  ExpirationPlugin: jest.fn(),
}));

jest.mock("workbox-precaching", () => ({
  createHandlerBoundToURL: jest.fn(() => jest.fn()),
  precacheAndRoute: jest.fn(),
}));

jest.mock("workbox-routing", () => ({
  NavigationRoute: jest.fn(),
  registerRoute: jest.fn(),
}));

jest.mock("workbox-strategies", () => ({
  CacheFirst: jest.fn(),
  NetworkOnly: jest.fn(),
  StaleWhileRevalidate: jest.fn(),
}));

describe("service worker lifecycle", () => {
  let addEventListenerSpy;
  let serviceWorkerGlobal;

  beforeEach(() => {
    jest.resetModules();
    serviceWorkerGlobal = window;
    serviceWorkerGlobal.__WB_MANIFEST = [];
    serviceWorkerGlobal.skipWaiting = jest.fn();
    addEventListenerSpy = jest.spyOn(serviceWorkerGlobal, "addEventListener");
  });

  afterEach(() => {
    addEventListenerSpy.mockRestore();
    delete serviceWorkerGlobal.__WB_MANIFEST;
    delete serviceWorkerGlobal.skipWaiting;
  });

  it("activates an installed update without requiring a client message", () => {
    require("./service-worker");

    const installHandler = addEventListenerSpy.mock.calls.find(
      ([eventName]) => eventName === "install",
    )?.[1];

    expect(installHandler).toEqual(expect.any(Function));
    installHandler();
    expect(serviceWorkerGlobal.skipWaiting).toHaveBeenCalledTimes(1);
  });
});
