import fs from 'node:fs/promises';
import path from 'node:path';

const scrapedDataDir = path.join(process.cwd(), '..', 'selenium', 'scraped_data');

/**
 * Returns the path to the most recent timestamped run directory
 * inside selenium/scraped_data/ (e.g. "2026-02-08_143022").
 */
export async function getLatestRunDir(): Promise<string> {
  const entries = await fs.readdir(scrapedDataDir, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (!runs.length) throw new Error('No scraped runs found in selenium/scraped_data');
  return path.join(scrapedDataDir, runs[runs.length - 1]);
}

export async function readJson<T = any>(file: string): Promise<T> {
  const s = await fs.readFile(file, 'utf-8');
  return JSON.parse(s);
}
