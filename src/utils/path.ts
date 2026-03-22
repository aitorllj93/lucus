import { homedir } from 'node:os';
import { extname, join } from 'node:path';

export function getStoragePath(path: string) {
  if (path.startsWith("~/")) {
    return join(homedir(), path.slice(2));
  }

  return path;
}

export function getAssetsPath() {
  return join(import.meta.dirname, "public/assets");
}

export function getFilePath(storage: string, p: string) {
  return join(storage, decodeURIComponent(p));
}

export function getExtension(p: string) {
  return extname(p).slice(1).toLowerCase();
}