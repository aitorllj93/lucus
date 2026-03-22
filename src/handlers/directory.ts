import type { NextFunction, Request, Response } from "express";
import { promises as fs, type Stats } from "node:fs";
import path from "node:path";
import { status as STATUS } from "http-status";

import { IGNORE_FILES, IMAGE_FORMATS, VIDEO_FORMATS } from "../constants";

import { BadRequestError } from "../utils/errors";
import { capitalize, escapeHtml, formatDate, formatSize, getIcon, getTemplate, IconName, render } from "../utils/tpl";
import { getExtension } from "../utils/path";

type Entry = {
  name: string;
  href: string;
  isDirectory: boolean;
  type: 'folder' | 'file' | 'image' | 'video';
  size: number;
  modified: Date;
};


const HTML_TPL = await getTemplate('directory');
const ROW_TPL = await getTemplate('row');

const CHEVRON_LEFT_ICON = await getIcon('chevron-left');

const ICONS: Record<Entry['type'], string> = {
  folder: await getIcon('folder'),
  file: await getIcon('file'),
  image: await getIcon('image'),
  video: await getIcon('video'),
}

async function buildDirectoryPage(args: {
  title: string;
  currentPath: string;
  parentHref: string | null;
  entries: Array<Entry>;
}): Promise<string> {
  const { title, currentPath, parentHref, entries } = args;

  const renderEntry = (entry: Entry) => render(ROW_TPL, {
    href: entry.href,
    name: escapeHtml(entry.name),
    icon: ICONS[entry.type],
    type: capitalize(entry.type),
    sizeLabel: escapeHtml(entry.isDirectory ? "—" : formatSize(entry.size)),
    modifiedLabel: escapeHtml(formatDate(entry.modified)),
  });

  return render(HTML_TPL, {
    title: escapeHtml(title),
    path: escapeHtml(currentPath),
    elementsCount: `${entries.length} element${entries.length === 1 ? "" : "s"}`,
    parentLink: parentHref
      ? `
        <a
          href="${parentHref}"
          class="rounded-lg px-1.5 py-1 [&>svg]:size-5 text-base-800 dark:text-base-200 transition hover:bg-black/10 dark:hover:bg-white/10"
        >
          ${CHEVRON_LEFT_ICON}
        </a>
      `
      : `
        <button
          disabled
          class="rounded-lg px-1.5 py-1 [&>svg]:size-5 text-base-600 dark:text-base-400"
        >
          ${CHEVRON_LEFT_ICON}
        </button>
      `,
    rows: entries.length > 0 ? entries
      .map(renderEntry)
      .join("") : `<li class="rounded-xl border border-dashed border-black/10 dark:border-white/10 px-4 py-10 text-center text-base-800 dark:text-base-400">
        This directory is empty.
      </li>`
  });
}

export async function handleDirectory(
  dirPath: string,
  stats: Stats,
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  try {
    if (!stats.isDirectory()) {
      throw new BadRequestError("Invalid Resource.");
    }

    const dirents = await fs.readdir(dirPath, { withFileTypes: true });

    const entries: Entry[] = await Promise.all(
      dirents
        .sort((a, b) => {
          if (a.isDirectory() && !b.isDirectory()) return -1;
          if (!a.isDirectory() && b.isDirectory()) return 1;
          return a.name.localeCompare(b.name);
        })
        .filter(dirent => !IGNORE_FILES.has(dirent.name))
        .map(async (dirent) => {
          const isDirectory = dirent.isDirectory();
          const absolute = path.join(dirPath, dirent.name);
          const entryStats = await fs.stat(absolute);

          const baseUrl = req.path.endsWith("/") ? req.path : `${req.path}/`;
          const href = `${baseUrl}${encodeURIComponent(dirent.name)}${isDirectory ? "/" : ""}`;
          const ext = isDirectory ? undefined : getExtension(dirent.name);

          let type: IconName = isDirectory ? 'folder' : 'file';

          if (ext) {
            if (IMAGE_FORMATS.has(ext)) {
              type = 'image';
            } else if (VIDEO_FORMATS.has(ext)) {
              type = 'video';
            }
          }

          return {
            name: dirent.name,
            href,
            isDirectory,
            type,
            size: entryStats.size,
            modified: entryStats.mtime,
          };
        }),
    );

    const normalizedPath = req.path || "/";
    const parentHref =
      normalizedPath === "/"
        ? null
        : normalizedPath.split("/").slice(0, -2).join("/") || "/";

    // Only return errors in json format if explicitly requested
    if (req.accepts().includes('application/json')) {
      res.status(STATUS.OK).json(entries);
      return;
    }

    const html = await buildDirectoryPage({
      title: `Index of ${normalizedPath}`,
      currentPath: normalizedPath,
      parentHref,
      entries,
    });

    res.status(200).type("html").send(html);
  } catch (error) {
    next(error);
  }
}