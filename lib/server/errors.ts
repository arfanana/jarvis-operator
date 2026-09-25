// Consistent production error model. Never expose stack traces or secrets.
export type ApiErrorCode =
  | "validation"
  | "authentication"
  | "authorization"
  | "rate_limited"
  | "provider"
  | "database"
  | "ai"
  | "deployment"
  | "not_configured"
  | "internal";

const STATUS: Record<ApiErrorCode, number> = {
  validation: 400,
  authentication: 401,
  authorization: 403,
  rate_limited: 429,
  provider: 502,
  database: 503,
  ai: 502,
  deployment: 502,
  not_configured: 503,
  internal: 500,
};

export class ApiError extends Error {
  code: ApiErrorCode;
  status: number;
  detail?: string;
  constructor(code: ApiErrorCode, message: string, detail?: string) {
    super(message);
    this.code = code;
    this.status = STATUS[code];
    this.detail = detail;
  }
}

export function err(code: ApiErrorCode, message: string, detail?: string): ApiError {
  return new ApiError(code, message, detail);
}

/** Serialize any thrown value into a safe JSON body + status. */
export function toErrorResponse(e: unknown): { body: { error: { code: ApiErrorCode; message: string } }; status: number } {
  if (e instanceof ApiError) {
    return { body: { error: { code: e.code, message: e.message } }, status: e.status };
  }
  const status = (e as { status?: number })?.status;
  if (status === 401) return { body: { error: { code: "authentication", message: "Authentication required." } }, status: 401 };
  if (status === 403) return { body: { error: { code: "authorization", message: "Not authorized." } }, status: 403 };
  // Never leak internals.
  console.error("[api]", e instanceof Error ? e.message : e);
  return { body: { error: { code: "internal", message: "Something went wrong. Try again." } }, status: 500 };
}

export function requireString(v: unknown, name: string, max = 500): string {
  if (typeof v !== "string" || !v.trim()) throw err("validation", `${name} is required.`);
  if (v.length > max) throw err("validation", `${name} is too long (max ${max}).`);
  return v.trim();
}

export function capPayload(body: unknown, maxBytes: number): void {
  if (JSON.stringify(body ?? {}).length > maxBytes) throw err("validation", "Payload too large.");
}
