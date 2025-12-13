import { AUTH_SESSION_CACHE_TTL_SECONDS } from "./constants";

type SecondaryStorage = {
  get: (key: string) => Promise<string | null>;
  set: (key: string, value: string, ttlSeconds?: number) => Promise<void>;
  delete: (key: string) => Promise<void>;
};

export type KvSecondaryStorageOptions = {
  prefix?: string;
  defaultTtlSeconds?: number;
};

/**
 * KV-backed secondary storage adapter for Better Auth.
 *
 * KV is eventually consistent: treat this as best-effort cache only.
 */
export function kvSecondaryStorage(kv: KVNamespace, opts: KvSecondaryStorageOptions = {}): SecondaryStorage {
  const prefix = opts.prefix ?? "";
  const defaultTtl = opts.defaultTtlSeconds ?? AUTH_SESSION_CACHE_TTL_SECONDS;

  return {
    async get(key) {
      return await kv.get(prefix + key);
    },
    async set(key, value, ttlSeconds) {
      const expirationTtl = ttlSeconds ?? defaultTtl;
      await kv.put(prefix + key, value, { expirationTtl });
    },
    async delete(key) {
      await kv.delete(prefix + key);
    }
  };
}
