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

export async function registerVault(address, data) {
  const client = getRedis();
  const record = { ...data, address, registeredAt: Date.now() };
  if (client) {
    await client.sadd(REGISTRY_KEY, address);
    await client.set(VAULT_PREFIX + address, record);
  } else {
    memoryRegistry.add(address);
    memoryStore.set(VAULT_PREFIX + address, record);
  }
  return record;
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
  const client = getRedis();
  const record = (await getVaultRecord(address)) || { address };
  const updated = { ...record, lastCheck: result };
  if (client) {
    await client.set(VAULT_PREFIX + address, updated);
  } else {
    memoryStore.set(VAULT_PREFIX + address, updated);
  }
  return updated;
}
