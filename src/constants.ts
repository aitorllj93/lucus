
export const CACHE_SIZE_LIMIT = 5 * 1024 * 1024; // 5mb
export const FALLBACK_CONTENT_TYPE = "application/octet-stream";

export const IGNORE_FILES = new Set([
	'.DS_Store'
])

// Supported formats
export const IMAGE_FORMATS = new Set([
	"jpg",
	"jpeg",
	"png",
	"webp",
	"avif",
	"gif",
	"tiff",
]);

export const VIDEO_FORMATS = new Set([
  "mp4", 
  "webm", 
  "mov", 
  "avi"
]);

