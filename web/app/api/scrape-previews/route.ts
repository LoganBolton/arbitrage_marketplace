import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { PrismaClient } from '@prisma/client';
import fs from 'node:fs/promises';
import path from 'node:path';
import { randomUUID } from 'node:crypto';

const execAsync = promisify(exec);
const prisma = new PrismaClient();

async function getLatestRunDir() {
  const base = path.join(process.cwd(), '..', 'selenium', 'scraped_data');
  const entries = await fs.readdir(base, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (!runs.length) throw new Error('No scraped runs found');
  return path.join(base, runs[runs.length - 1]);
}

async function readJson(file: string) {
  const s = await fs.readFile(file, 'utf-8');
  return JSON.parse(s);
}

async function importPreviews() {
  const latestRunDir = await getLatestRunDir();
  const previewsPath = path.join(latestRunDir, 'marketplace_listings.json');
  const previews = await readJson(previewsPath);

  let created = 0, updated = 0;

  for (const preview of previews) {
    const id = randomUUID();
    const link = preview.link;
    const title = preview.title || 'Untitled';
    const price = preview.price || 'N/A';
    const location = preview.location || null;
    const imageUrl = preview.image_url || null;

    const res = await prisma.listingPreview.upsert({
      where: { link },
      create: {
        id,
        link,
        title,
        price,
        location,
        imageUrl,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        detailsScrapedAt: null,
      },
      update: {
        title,
        price,
        location,
        imageUrl,
        lastSeenAt: new Date(),
      },
    });

    if (res.id === id) created++;
    else updated++;
  }

  return { total: previews.length, created, updated };
}

export async function POST() {
  try {
    console.log('[1/3] Starting preview scraper...');

    // Step 1: Run the Python scraper
    const scraperPath = path.join(process.cwd(), '..', 'selenium', 'scrape_listings.py');
    const venvPython = path.join(process.cwd(), '..', '.venv', 'bin', 'python');

    const { stdout, stderr } = await execAsync(`${venvPython} ${scraperPath}`);

    console.log('[2/3] Scraper completed. Output:', stdout);
    if (stderr) console.log('Scraper stderr:', stderr);

    // Step 2: Import the JSON to database
    console.log('[3/3] Importing to database...');
    const stats = await importPreviews();

    return NextResponse.json({
      success: true,
      message: 'Preview scraping and import completed',
      stats,
      scraperOutput: stdout,
    });

  } catch (error: any) {
    console.error('Scraping pipeline failed:', error);
    return NextResponse.json(
      {
        success: false,
        error: error.message,
        details: error.stderr || error.stdout,
      },
      { status: 500 }
    );
  } finally {
    await prisma.$disconnect();
  }
}

// Optional: GET endpoint to check status
export async function GET() {
  try {
    const total = await prisma.listingPreview.count();
    const pending = await prisma.listingPreview.count({
      where: { detailsScrapedAt: null },
    });
    const scraped = total - pending;

    return NextResponse.json({
      total,
      pending,
      scraped,
      pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  } finally {
    await prisma.$disconnect();
  }
}
