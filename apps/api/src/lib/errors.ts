import type { ContentfulStatusCode } from "hono/utils/http-status";

export class HttpError extends Error {
  readonly status: ContentfulStatusCode;
  readonly code: string;

  constructor(status: ContentfulStatusCode, code: string, message: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

export function badRequest(message: string, code = "bad_request") {
  return new HttpError(400, code, message);
}

export function unauthorized(message = "Unauthorized", code = "unauthorized") {
  return new HttpError(401, code, message);
}

export function internalError(message = "Internal error", code = "internal_error") {
  return new HttpError(500, code, message);
}
