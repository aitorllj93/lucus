
import mime from 'mime';

import { FALLBACK_CONTENT_TYPE } from '../constants';

export const getContentType = (ext: string) =>
  mime.getType(ext) ?? FALLBACK_CONTENT_TYPE;

export const getChunk = (range: string, fileSize: number) => {
  const parts = range.replace(/bytes=/, "").split("-");

  const start = Number.parseInt(parts[0] ?? "0", 10);
  const end =
    parts[1] !== undefined ? Number.parseInt(parts[1], 10) : fileSize - 1;
  const size = end - start + 1;

  return { start, end, size };
}