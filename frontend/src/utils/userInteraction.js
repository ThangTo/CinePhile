// Simple global user-interaction tracker for autoplay-with-sound eligibility
let hasUserInteracted = false;
let initialized = false;
const subscribers = new Set();

const notify = () => {
  subscribers.forEach((cb) => {
    try {
      cb(hasUserInteracted);
    } catch (e) {
      // ignore subscriber errors
    }
  });
};

const markInteracted = () => {
  if (hasUserInteracted) return;
  hasUserInteracted = true;
  notify();
};

export const initUserInteractionListener = () => {
  if (initialized) return;
  initialized = true;
  const options = { once: true, passive: true };
  window.addEventListener("click", markInteracted, options);
  window.addEventListener("keydown", markInteracted, options);
  window.addEventListener("touchstart", markInteracted, options);
};

export const getHasUserInteracted = () => hasUserInteracted;

export const subscribeUserInteraction = (cb) => {
  if (typeof cb === "function") {
    subscribers.add(cb);
  }
  return () => subscribers.delete(cb);
};
