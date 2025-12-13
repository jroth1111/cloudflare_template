import type { D1Database, D1DatabaseSession } from "@cloudflare/workers-types";

export const D1_BOOKMARK_HEADER = "x-d1-bookmark";

export type CreateD1SessionOptions = {
  headerName?: string;
  defaultBookmark?: string;
};

export function createD1SessionFromRequest(
  db: D1Database,
  request: Request,
  options: CreateD1SessionOptions = {}
): { session: D1DatabaseSession; headerName: string } {
  const headerName = options.headerName ?? D1_BOOKMARK_HEADER;
  const bookmark = request.headers.get(headerName) ?? options.defaultBookmark ?? "first-unconstrained";
  return { session: db.withSession(bookmark), headerName };
}

export function attachD1BookmarkHeader(
  response: Response,
  session: D1DatabaseSession,
  headerName: string = D1_BOOKMARK_HEADER
): Response {
  const headers = new Headers(response.headers);
  headers.set(headerName, session.getBookmark() ?? "");
  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers
  });
}

export async function retryWhile<T>(
  fn: () => Promise<T>,
  shouldRetry: (err: unknown, attempt: number) => boolean
): Promise<T> {
  let attempt = 1;
  while (true) {
    try {
      return await fn();
    } catch (err) {
      if (!shouldRetry(err, attempt)) throw err;
      attempt += 1;
    }
  }
}

export function shouldRetryD1SessionError(err: unknown, attempt: number): boolean {
  if (attempt >= 5) return false;
  const msg = String(err);
  return (
    msg.includes("Network connection lost") ||
    msg.includes("storage caused object to be reset") ||
    msg.includes("reset because its code was updated")
  );
}

