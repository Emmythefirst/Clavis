// Persistence for Vault Watch — the always-on half of Guardian (see
// PROGRESS.md). Watch-only: stores nothing but public vault addresses,
// public scriptPubKeys, and the results of checks against public daemon
// data. No keys, no mnemonics, no signing ever touch this file or anything
// it calls.
//
// Uses Upstash Redis (REST-based — works from Vercel's serverless runtime
// without connection pooling headaches) when UPSTASH_REDIS_REST_URL /
// UPSTASH_REDIS_REST_TOKEN are set. Falls back to an in-process Map when
// they aren't, so `vercel dev` / local testing works without provisioning a
// real database — but that fallback resets on every cold start and does NOT
// persist in actual serverless production. Real persistence requires
// setting those two env vars (see README for setup).

import { Redis } from "@upstash/redis";

const REGISTRY_KEY = "guardian:registered";
const VAULT_PREFIX = "guardian:vault:";

let redis = null;
let usingFallback = false;
const memoryStore = new Map(); // key -> value, used only when Redis isn't configured
const memoryRegistry = new Set();

function getRedis() {
  if (redis || usingFallback) return redis;
  if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
    redis = Redis.fromEnv();
  } else {
    usingFallback = true;
    console.warn(
      "guardian: UPSTASH_REDIS_REST_URL/UPSTASH_REDIS_REST_TOKEN not set — using an in-memory store. " +
        "This is fine for local dev but will NOT persist across deployments or cold starts in production."
    );
  }
  return redis;
}

export function isUsingFallbackStore() {
  getRedis();
  return usingFallback;
}

async function writeRecord(address, record) {
  const client = getRedis();
  if (client) await client.set(VAULT_PREFIX + address, record);
  else memoryStore.set(VAULT_PREFIX + address, record);
  return record;
}

// Merges onto any existing record rather than replacing it outright —
// registration can legitimately run again for an already-registered vault
// (the client re-registers idempotently on every app load), and a naive
// overwrite here would silently wipe pushSubscriptions (see below) and
// lastCheck every time, which is exactly the kind of real bug that's easy to
// miss until a subscriber's second app load quietly stops notifying them.
export async function registerVault(address, data) {
  const existing = await getVaultRecord(address);
  const record = { ...existing, ...data, address, registeredAt: existing?.registeredAt ?? Date.now() };
  const client = getRedis();
  if (client) await client.sadd(REGISTRY_KEY, address);
  else memoryRegistry.add(address);
  return writeRecord(address, record);
}

export async function listRegisteredAddresses() {
  const client = getRedis();
  if (client) return client.smembers(REGISTRY_KEY);
  return Array.from(memoryRegistry);
}

export async function getVaultRecord(address) {
  const client = getRedis();
  if (client) return client.get(VAULT_PREFIX + address);
  return memoryStore.get(VAULT_PREFIX + address) ?? null;
}

export async function saveCheckResult(address, result) {
  const record = (await getVaultRecord(address)) || { address };
  return writeRecord(address, { ...record, lastCheck: result });
}

// Push subscriptions live on the same per-vault record, not a separate key —
// a vault can have several (one per device/browser that opted in), deduped
// by the subscription's own endpoint URL (unique per browser-push-service
// pairing). Requires the vault to already be registered: a push subscription
// with nowhere to attach its alerts isn't meaningful on its own.
export async function addPushSubscription(address, subscription) {
  const record = await getVaultRecord(address);
  if (!record) throw new Error("vault not registered for Vault Watch");
  const rest = (record.pushSubscriptions || []).filter((s) => s.endpoint !== subscription.endpoint);
  return writeRecord(address, { ...record, pushSubscriptions: [...rest, subscription] });
}

export async function removePushSubscription(address, endpoint) {
  const record = await getVaultRecord(address);
  if (!record) return null;
  const pushSubscriptions = (record.pushSubscriptions || []).filter((s) => s.endpoint !== endpoint);
  return writeRecord(address, { ...record, pushSubscriptions });
}
