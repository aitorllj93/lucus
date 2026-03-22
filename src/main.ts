import "varlock/auto-load";

import { ENV } from 'varlock';

import serve from "./server";

serve({
  path: ENV.STORAGE_PATH,
  port: ENV.PORT,
  redisUrl: ENV.REDIS_URL,
  cacheTTL: ENV.CACHE_TTL,
  logLevel: ENV.LOG_LEVEL,
  directoryListing: ENV.DIRECTORY_LISTING,
});