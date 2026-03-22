#!/usr/bin/env node
import { Command, Option } from "commander";

import serve from '../server';

async function main() {
  const program = new Command();

  program
    .name('lucus')
    .description('A local CDN with image transformations')
    .version('1.0.0')
    .argument('[STORAGE_PATH]', 'The path to serve from the cdn')
    .addOption(new Option('-p, --port <number>', 'port number').default(42070).env('PORT'))
    .addOption(new Option("--redis-url <string>", "Redis URL").default('redis://localhost:6379').env('REDIS_URL'))
    .addOption(new Option("--cache-ttl <number>", "Cache TTL").default(86400).env('CACHE_TTL'))
    .addOption(new Option("--log-level <string>", "Log Level").default('info').env('LOG_LEVEL'))
    .addOption(new Option("--directory-listing", "Enable directory listing").default(false).env('DIRECTORY_LISTING'))
    .action(
      (path, options) => serve({
        path: path ?? process.env.STORAGE_PATH,
        port: Number.parseInt(options.port),
        redisUrl: options.redisUrl,
        cacheTTL: Number.parseInt(options.cacheTtl),
        logLevel: options.logLevel,
        directoryListing: options.directoryListing,
      })
    );

  await program.parseAsync(process.argv);
}

main();