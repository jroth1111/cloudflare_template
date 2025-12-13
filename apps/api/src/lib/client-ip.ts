export function getClientIp(request: Request): string {
  const cfConnectingIp =
    (request as unknown as { cf?: { connectingIp?: string } }).cf?.connectingIp ?? null;
  if (cfConnectingIp) return cfConnectingIp;

  const headerCfConnectingIp = request.headers.get("cf-connecting-ip");
  if (headerCfConnectingIp) return headerCfConnectingIp;

  const forwarded = request.headers.get("x-northstar-client-ip");
  if (forwarded) return forwarded;

  const xff = request.headers.get("x-forwarded-for");
  if (xff) return xff.split(",")[0]?.trim() || "unknown";

  const realIp = request.headers.get("x-real-ip");
  if (realIp) return realIp;

  return "unknown";
}

