const isLocalDev =
  window.location.hostname === "localhost" && window.location.port === "3000";

export const API_BASE = isLocalDev ? "http://localhost:8081" : "";
