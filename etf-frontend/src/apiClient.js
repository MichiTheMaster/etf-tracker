import { API_BASE } from "./apiBase";

export class ApiError extends Error {
  constructor(message, status, data) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.data = data;
  }
}

function isJsonResponse(response) {
  const contentType = response.headers.get("content-type") || "";
  return contentType.includes("application/json");
}

async function parseResponseBody(response) {
  if (response.status === 204) {
    return null;
  }

  if (isJsonResponse(response)) {
    return response.json().catch(() => null);
  }

  const text = await response.text().catch(() => "");
  return text || null;
}

function normalizeHeaders(headers, hasJsonBody) {
  const normalizedHeaders = new Headers(headers || {});
  if (hasJsonBody && !normalizedHeaders.has("Content-Type")) {
    normalizedHeaders.set("Content-Type", "application/json");
  }
  return normalizedHeaders;
}

function buildErrorMessage(response, payload, fallbackMessage) {
  if (payload && typeof payload === "object") {
    if (typeof payload.message === "string" && payload.message.trim()) {
      return payload.message;
    }
    if (typeof payload.error === "string" && payload.error.trim()) {
      return payload.error;
    }
  }

  if (typeof payload === "string" && payload.trim()) {
    return payload;
  }

  if (response.status === 401 || response.status === 403) {
    return "Nicht angemeldet. Bitte erneut einloggen.";
  }

  return fallbackMessage || `API error: ${response.status}`;
}

export async function apiRequest(path, options = {}) {
  const {
    method = "GET",
    body,
    headers,
    credentials = "include",
    fallbackMessage,
    ...restOptions
  } = options;

  const hasJsonBody = body != null && !(body instanceof FormData);
  const response = await fetch(`${API_BASE}${path}`, {
    method,
    credentials,
    headers: normalizeHeaders(headers, hasJsonBody),
    body: hasJsonBody ? JSON.stringify(body) : body,
    ...restOptions
  });

  const payload = await parseResponseBody(response);

  if (!response.ok) {
    throw new ApiError(
      buildErrorMessage(response, payload, fallbackMessage),
      response.status,
      payload
    );
  }

  return payload;
}

export function apiGet(path, options) {
  return apiRequest(path, { ...options, method: "GET" });
}

export function apiPost(path, body, options) {
  return apiRequest(path, { ...options, method: "POST", body });
}

export function apiPut(path, body, options) {
  return apiRequest(path, { ...options, method: "PUT", body });
}

export function apiDelete(path, options) {
  return apiRequest(path, { ...options, method: "DELETE" });
}