import { NextResponse } from 'next/server';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import prisma from '@/lib/prisma';
import { getLatestRunDir, readJson } from '@/lib/scraped-data';
import { paths } from '@/lib/pipeline';

const execAsync = promisify(exec);

async function importPreviews() {
  const latestRunDir = await getLatestRunDir();
  const previews = await readJson<any[]>(path.join(latestRunDir, 'marketplace_listings.json'));

  let created = 0, updated = 0;

  for (const preview of previews) {
    const id = randomUUID();
    const link = preview.link;

    const res = await prisma.listingPreview.upsert({
      where: { link },
      create: {
        id,
        link,
        title: preview.title || 'Untitled',
        price: preview.price || 'N/A',
        location: preview.location || null,
        imageUrl: preview.image_url || null,
        firstSeenAt: new Date(),
        lastSeenAt: new Date(),
        detailsScrapedAt: null,
      },
      update: {
        title: preview.title || 'Untitled',
        price: preview.price || 'N/A',
        location: preview.location || null,
        imageUrl: preview.image_url || null,
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
    const { stdout, stderr } = await execAsync(`${paths.venvPython} ${paths.scrapeListings}`);

    if (stderr) console.log('Scraper stderr:', stderr);

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
      { success: false, error: error.message, details: error.stderr || error.stdout },
      { status: 500 },
    );
  }
}

export async function GET() {
  try {
    const total = await prisma.listingPreview.count();
    const pending = await prisma.listingPreview.count({ where: { detailsScrapedAt: null } });

    return NextResponse.json({
      total,
      pending,
      scraped: total - pending,
      pendingPercentage: total > 0 ? Math.round((pending / total) * 100) : 0,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
