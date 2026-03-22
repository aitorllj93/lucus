
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const TEMPLATES_DIR = join(import.meta.dirname, "templates");
const ICONS_DIR = join(TEMPLATES_DIR, "icons");

export function render(template: string, data: Record<string, string>) {
  return template.replace(/\{\{(.*?)\}\}/g, (_, key) => {
    return data[key.trim()] ?? "";
  });
}

export async function getTemplate(name: 'row' | 'directory') {
  return readFile(join(TEMPLATES_DIR, `${name}.html`), "utf8");
}

export type IconName = 'folder' | 'file' | 'image' | 'video' | 'chevron-left';
export async function getIcon(name: IconName) {
  return readFile(join(ICONS_DIR, `${name}.svg`), "utf8");
}

export function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  return `${(bytes / 1024 / 1024 / 1024).toFixed(1)} GB`;
}

export function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("es-ES", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
}

export const capitalize = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);