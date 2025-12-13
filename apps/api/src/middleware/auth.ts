import type { MiddlewareHandler } from "hono";
import { getAuth } from "../lib/auth";
import { unauthorized } from "../lib/errors";
import type { HonoEnv } from "../types";
import type { auth as createAuth } from "../features/auth/auth";

type AuthInstance = ReturnType<typeof createAuth>;
type GetSessionResult = Awaited<ReturnType<AuthInstance["api"]["getSession"]>>;

type BetterAuthUser = NonNullable<NonNullable<GetSessionResult>["user"]>;
type BetterAuthSession = NonNullable<NonNullable<GetSessionResult>["session"]>;

export type PublicUser = Pick<
  BetterAuthUser,
  "id" | "name" | "email" | "emailVerified"
> & {
  image: string | null;
};

export type PublicSession = Pick<BetterAuthSession, "expiresAt"> & {
  id: string | null;
};

function toPublicUser(user: BetterAuthUser): PublicUser {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    emailVerified: user.emailVerified,
    image: user.image ?? null
  };
}

function toPublicSession(session: BetterAuthSession): PublicSession {
  return { id: session.id ?? null, expiresAt: session.expiresAt };
}

export const authOptional: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const hasCookie = Boolean(c.req.header("cookie"));
  const hasAuthorization = Boolean(c.req.header("authorization"));
  if (!hasCookie && !hasAuthorization) {
    c.set("user", null);
    c.set("session", null);
    await next();
    return;
  }

  const session = await getAuth(c).api.getSession({ headers: c.req.raw.headers });
  c.set("user", session?.user ? toPublicUser(session.user) : null);
  c.set(
    "session",
    session?.session ? toPublicSession(session.session) : null
  );
  await next();
};

export const requireUser: MiddlewareHandler<HonoEnv> = async (c, next) => {
  const session = await getAuth(c).api.getSession({ headers: c.req.raw.headers });
  if (!session?.user) throw unauthorized("Sign in required.");
  c.set("user", toPublicUser(session.user));
  c.set(
    "session",
    session.session ? toPublicSession(session.session) : null
  );
  await next();
};
