const host = window.location.hostname;
const isLocalVite =
  window.location.port === "3000" &&
  (host === "localhost" || host === "127.0.0.1");

// Same hostname as the page, so 127.0.0.1:3000 talks to 127.0.0.1:8081 (not HTML from Vite).
export const API_BASE = isLocalVite ? `http://${host}:8081` : "";
