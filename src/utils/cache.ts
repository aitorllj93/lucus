import { createHash } from "node:crypto";
import { createClient, type RedisClientType } from "redis";

import { getLogger } from './logger';

let redis: RedisClientType;
let cacheTTL: number;

export const initializeCache = (url: string, ttl: number) => {
  const logger = getLogger();

  cacheTTL = ttl;
  redis = createClient({
    url,
    socket: {
      reconnectStrategy(retries) {
        const base = Math.min(1000 * 2 ** retries, 30000);
        const jitter = Math.random() * 300;
        return base + jitter;
      }
    }
  });

  let connected = false;
  redis.on("error", (err: AggregateError) => {
    const msg = err.errors?.[0]?.message ?? err.message;

    // ignora spam típico de reconnect
    if (msg.includes("ECONNREFUSED")) {
      logger.debug({ err: msg }, "Redis refused");
      if (connected) {
        connected = false;
        logger.warn("Redis disconnected, cache disabled");
      }
      return;
    }
    
    logger.error({ err: msg }, "Redis error");
  });

  let lastReconnectLog = 0;
  redis.on("reconnecting", () => {
    const now = Date.now();
    if (now - lastReconnectLog > 10000) {
      lastReconnectLog = now;
      logger.debug("Redis reconnecting...");
    }
  });

  redis.on("ready", () => {
    connected = true;
    logger.info("Redis connected, cache enabled");
  });

  void redis.connect().catch(() => {
    logger.warn("Redis offline, continuing without cache");
  });

  setTimeout(() => {
    if (!connected) {
      logger.warn("Redis unavailable at startup, running without cache");
    }
  }, 1500);
};

export function generateCacheKey(
	key: string
): string {
	const hash = createHash("md5")
		.update(key)
		.digest("hex");
	return `cdn:${hash}`;
}

export async function get(key: string): Promise<string | null> {
  const logger = getLogger();
  if (!redis.isReady) {
    return null;
  }

  try {
    return await redis.get(key);
  } catch (err) {
    logger.debug({ err }, "Redis GET failed");
    return null;
  }
}

export async function set(key: string, value: string | Buffer<ArrayBuffer>) {
  const logger = getLogger();
	if (!redis.isReady) {
    return;
  }

  try {
    await redis.setEx(key, cacheTTL, value);
  } catch (err) {
    logger.debug({ err }, "Redis SET failed");
  }
}

export const getCacheControl = () => `public, max-age=${cacheTTL}`;