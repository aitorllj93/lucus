import { type Stats, createReadStream } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { status as STATUS } from 'http-status';

import { CACHE_SIZE_LIMIT } from "../constants";

import { generateCacheKey, get, getCacheControl, set } from "../utils/cache";
import { getChunk, getContentType } from "../utils/content";
import { getLogger } from "../utils/logger";


export async function handleFile(
	filePath: string,
	ext: string,
	stats: Stats,
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const logger = getLogger();
  const contentType = getContentType(ext);
	const range = req.headers.range;

	// For large files or when range is requested, stream directly without caching
	if (stats.size > CACHE_SIZE_LIMIT || range !== undefined) {
		if (range === undefined) {
			res.writeHead(STATUS.OK, {
				"Content-Length": stats.size,
				"Content-Type": contentType,
				"Cache-Control": getCacheControl(),
				"Accept-Ranges": "bytes",
			});

			const stream = createReadStream(filePath);
			stream.pipe(res);
			return;
		}

		// Support range requests for large files
		const { start, end, size } = getChunk(range, stats.size);

		res.writeHead(STATUS.PARTIAL_CONTENT, {
			"Content-Range": `bytes ${start}-${end}/${stats.size}`,
			"Accept-Ranges": "bytes",
			"Content-Length": size,
			"Content-Type": contentType,
			"Cache-Control": getCacheControl(),
		});

		const stream = createReadStream(filePath, { start, end });
		stream.pipe(res);
		return;
	}

	// For small files, try to use cache
	const cacheKey = generateCacheKey(filePath);

	// Try to get from cache
	try {
		const cached = await get(cacheKey);
		if (cached !== null) {
			res.writeHead(STATUS.OK, {
				"Content-Type": contentType,
				"Content-Length": cached.length,
				"Cache-Control": getCacheControl(),
				"X-Cache": "HIT",
				"Accept-Ranges": "bytes",
			});
			res.end(cached);
			return;
		}
	} catch (cacheError) {
		logger.warn({ err: cacheError }, "Cache read error");
	}

	// Read file and cache it
	const stream = createReadStream(filePath);
	const chunks: Buffer[] = [];

	stream.on("data", (chunk) => {
		chunks.push(chunk as Buffer);
	});

	stream.on("end", async () => {
		const buffer = Buffer.concat(chunks);

		// Store in cache
		try {
			await set(cacheKey, buffer);
		} catch (cacheError) {
			logger.warn({ err: cacheError }, "Cache write error");
		}

		// Send response
		res.writeHead(STATUS.OK, {
			"Content-Type": contentType,
			"Content-Length": buffer.length,
			"Cache-Control": getCacheControl(),
			"X-Cache": "MISS",
			"Accept-Ranges": "bytes",
		});
		res.end(buffer);
	});

	stream.on("error", (err) => {
		logger.error({ err }, "Error reading file");
		next(err);
	});
}

