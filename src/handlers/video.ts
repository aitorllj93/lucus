import { type Stats, createReadStream } from "node:fs";
import type { NextFunction, Request, Response } from "express";
import { status as STATUS } from 'http-status';

import { getCacheControl } from "../utils/cache";
import { getChunk, getContentType } from "../utils/content";

export async function handleVideo(
	filePath: string,
	ext: string,
	stats: Stats,
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const contentType = getContentType(ext);
	const range = req.headers.range;

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
