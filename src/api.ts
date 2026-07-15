import type { ApiError } from "./types";

export class ApiClientError extends Error {
  readonly code: string;
  readonly status: number;
  readonly details: string;

  constructor(code: string, message: string, status: number, details = "") {
    super(details ? `${message} ${details}` : message);
    this.name = "ApiClientError";
    this.code = code;
    this.status = status;
    this.details = details;
  }
}

function apiErrorFrom(payload: unknown): ApiError["error"] | undefined {
  if (!payload || typeof payload !== "object") return undefined;
  const error = (payload as ApiError).error;
  return error && typeof error === "object" ? error : undefined;
}

function readableDetails(details: unknown): string {
  return typeof details === "string" ? details.trim() : "";
}

export async function readJsonResponse<T>(response: Response): Promise<T> {
  const text = await response.text();
  let payload: unknown = null;
  if (text) {
    try {
      payload = JSON.parse(text);
    } catch {
      if (response.ok) {
        throw new ApiClientError("INVALID_JSON", "The server returned an invalid response. · 服务返回了无效响应。", response.status);
      }
    }
  }

  if (!response.ok) {
    const error = apiErrorFrom(payload);
    throw new ApiClientError(
      error?.code || "REQUEST_FAILED",
      error?.message || `Request failed with ${response.status}. · 请求失败（${response.status}）`,
      response.status,
      readableDetails(error?.details),
    );
  }
  if (payload === null) {
    throw new ApiClientError("EMPTY_RESPONSE", "The server returned an empty response. · 服务返回了空响应。", response.status);
  }
  return payload as T;
}

export async function requestJson<T>(input: RequestInfo | URL, init?: RequestInit): Promise<T> {
  return readJsonResponse<T>(await fetch(input, init));
}
