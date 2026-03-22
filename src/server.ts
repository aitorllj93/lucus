
import { existsSync, statSync } from "node:fs";
import express, {
  type Request,
  type Response,
  type NextFunction,
} from "express";

import { IMAGE_FORMATS, VIDEO_FORMATS } from "./constants";

import { handleDirectory } from "./handlers/directory";
import { handleError } from "./handlers/error";
import { handleFile } from "./handlers/file";
import { handleImage } from "./handlers/image";
import { handleVideo } from "./handlers/video";

import { initializeCache } from "./utils/cache";
import { createLogger, getLogger } from "./utils/logger";
import { getExtension, getAssetsPath, getFilePath, getStoragePath } from "./utils/path";
import { BadRequestError, ForbiddenError, NotFoundError } from "./utils/errors";

type ServerOpts = {
  path: string;
  port: number;
  redisUrl: string;
  cacheTTL: number;
  logLevel: string;
  directoryListing: boolean;
}

export default function serve(opts: ServerOpts) {
  createLogger(opts.logLevel);
  initializeCache(opts.redisUrl, opts.cacheTTL);
  const app = express();
  const storagePath = getStoragePath(opts.path);

  const logger = getLogger();

  // Health check endpoint
  app.get("/health", (_req: Request, res: Response) => {
    res.json({ status: "ok", timestamp: new Date().toISOString() });
  });

  if (opts.directoryListing) {
    app.use("/assets", express.static(getAssetsPath()));

    app.get("/", async (req: Request, res: Response, next: NextFunction) => {
      try {
        const filePath = getFilePath(storagePath, '');
        const stats = statSync(filePath);
        if (!stats.isFile()) {
          return handleDirectory(filePath, stats, req, res, next);
        }
      } catch (error) {
        next(error);
      }
    });
  }

  // Main CDN endpoint
  app.get("/*splat", async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Get file path from URL
      const requestPath = req.path.slice(1); // Remove leading slash
      const filePath = getFilePath(storagePath, requestPath);

      // Security: Prevent path traversal
      if (!filePath.startsWith(storagePath)) {
        throw new ForbiddenError();
      }

      // Check if file exists
      if (!existsSync(filePath)) {
        throw new NotFoundError();
      }

      // Check if it's a file (not a directory)
      const stats = statSync(filePath);
      if (!stats.isFile()) {
        if (!opts.directoryListing) {
          throw new BadRequestError("Invalid Resource.");
        }

        return handleDirectory(filePath, stats, req, res, next);
      }

      const ext = getExtension(filePath);

      // Handle video files (no transformation, just streaming)
      if (VIDEO_FORMATS.has(ext)) {
        return handleVideo(filePath, ext, stats, req, res, next);
      }

      // Handle image files with transformations
      if (IMAGE_FORMATS.has(ext)) {
        return handleImage(filePath, ext, req, res, next);
      }

      // Handle all other file types (documents, audio, archives, etc.)
      return handleFile(filePath, ext, stats, req, res, next);

    } catch (error) {
      next(error);
    }
  });

  // Apply error handler
  app.use(handleError);

  // Start server
  app.listen(opts.port, () => {
    logger.info(`CDN server running on port ${opts.port}`);
    logger.info(`Storage path: ${storagePath}`);
    logger.info(`Cache TTL: ${opts.cacheTTL} seconds`);
  });

}