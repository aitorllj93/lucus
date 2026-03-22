import { readFile } from 'node:fs/promises';
import type { NextFunction, Request, Response } from "express";
import sharp from "sharp";
import { status as STATUS } from 'http-status';

import { generateCacheKey, get, getCacheControl, set } from "../utils/cache";
import { getContentType } from '../utils/content';
import { getOutputFormat, needsTransformations, transformImage, type ImageTransformParams } from '../utils/image';
import { getLogger } from "../utils/logger";

// Parse transformation parameters from URL
function parseTransformParams(
	query: Record<string, unknown>,
): ImageTransformParams {
	const params: ImageTransformParams = {};

	// Dimensions
	if (query.w || query.width) {
		const width = Number.parseInt(String(query.w ?? query.width), 10);
		if (!Number.isNaN(width) && width > 0 && width <= 5000) {
			params.width = width;
		}
	}

	if (query.h || query.height) {
		const height = Number.parseInt(String(query.h ?? query.height), 10);
		if (!Number.isNaN(height) && height > 0 && height <= 5000) {
			params.height = height;
		}
	}

	// Quality (1-100)
	if (query.q || query.quality) {
		const quality = Number.parseInt(String(query.q ?? query.quality), 10);
		if (!Number.isNaN(quality) && quality >= 1 && quality <= 100) {
			params.quality = quality;
		}
	}

	// Format
	if (query.f || query.format) {
		const format = String(query.f ?? query.format).toLowerCase();
		if (["jpeg", "png", "webp", "avif", "gif", "tiff"].includes(format)) {
			params.format = format as ImageTransformParams["format"];
		}
	}

	// Fit mode
	if (query.fit) {
		const fit = String(query.fit).toLowerCase();
		if (["cover", "contain", "fill", "inside", "outside"].includes(fit)) {
			params.fit = fit as ImageTransformParams["fit"];
		}
	}

	// Gravity/Position
	if (query.g || query.gravity) {
		const gravity = String(query.g ?? query.gravity).toLowerCase();
		if (
			[
				"north",
				"northeast",
				"east",
				"southeast",
				"south",
				"southwest",
				"west",
				"northwest",
				"center",
				"centre",
				"auto",
				"attention",
				"entropy",
			].includes(gravity)
		) {
			params.gravity = gravity as ImageTransformParams["gravity"];
		}
	}

	// Blur (0-100)
	if (query.blur) {
		const blur = Number.parseFloat(String(query.blur));
		if (!Number.isNaN(blur) && blur >= 0 && blur <= 100) {
			params.blur = blur;
		}
	}

	// Sharpen
	if (query.sharpen === "true" || query.sharpen === "1") {
		params.sharpen = true;
	}

	// Grayscale
	if (
		query.grayscale === "true" ||
		query.grayscale === "1" ||
		query.grey === "true"
	) {
		params.grayscale = true;
	}

	// Rotate (0-360)
	if (query.rotate || query.r) {
		const rotate = Number.parseInt(String(query.rotate ?? query.r), 10);
		if (!Number.isNaN(rotate)) {
			params.rotate = rotate % 360;
		}
	}

	// Flip vertically
	if (query.flip === "true" || query.flip === "1") {
		params.flip = true;
	}

	// Flop horizontally
	if (query.flop === "true" || query.flop === "1") {
		params.flop = true;
	}

	// Background color
	if (query.bg || query.background) {
		params.background = String(query.bg ?? query.background);
	}

	// Animated (default true to preserve backward compatibility)
	if (query.animated === "false" || query.animated === "0") {
		params.animated = false;
	}

	return params;
}

export async function handleImage(
	filePath: string,
	ext: string,
	req: Request,
	res: Response,
	next: NextFunction,
): Promise<void> {
	const logger = getLogger();
	const params = parseTransformParams(req.query as Record<string, unknown>);

	// If no transformations needed, serve original file directly
	if (!(await needsTransformations(filePath, ext, params))) {
		try {
			const fileBuffer = await readFile(filePath);
			res.writeHead(STATUS.OK, {
				"Content-Type": getContentType(ext),
				"Cache-Control": getCacheControl(),
				"X-Transform": "NONE",
			});
			res.end(fileBuffer);
			return;
		} catch (error) {
			next(error);
			return;
		}
	}

	const cacheKey = generateCacheKey(`${filePath}:${JSON.stringify(params)}`);

	// Calculate output format consistently (same logic as transformImage)
	const outputFormat = params.format ?? getOutputFormat(ext);

	// Try to get from cache
	try {
		const cached = await get(cacheKey)
		if (cached !== null) {
			res.writeHead(STATUS.OK, {
				"Content-Type": getContentType(outputFormat),
				"Cache-Control": getCacheControl(),
				"X-Cache": "HIT",
				"X-Gravity": params.gravity || "none",
			});
			res.end(Buffer.from(cached, "base64"));
			return;
		}
	} catch (cacheError) {
		logger.warn({ err: cacheError }, "Cache read error");
	}

	// Read and transform image
	const inputBuffer = await sharp(filePath).toBuffer();
	const outputBuffer = await transformImage(inputBuffer, params, ext);

	// Store in cache
	try {
		await set(cacheKey, outputBuffer.toString("base64"));
	} catch (cacheError) {
		logger.warn({ err: cacheError }, "Cache write error");
	}

	// Send response
	res.writeHead(STATUS.OK, {
		"Content-Type": getContentType(outputFormat),
		"Cache-Control": getCacheControl(),
		"X-Cache": "MISS",
		"X-Gravity": params.gravity || "none",
	});
	res.end(outputBuffer);
}
