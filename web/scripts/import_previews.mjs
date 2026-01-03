#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";
import { randomUUID } from "node:crypto";

const prisma = new PrismaClient();

async function getLatestRunDir() {
  const base = path.join(process.cwd(), "..", "selenium", "scraped_data");
  const entries = await fs.readdir(base, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (!runs.length) throw new Error("No scraped runs found in selenium/scraped_data");
  return path.join(base, runs[runs.length - 1]);
}

async function readJson(file) {
  const s = await fs.readFile(file, "utf-8");
  return JSON.parse(s);
}

async function main() {
  const latestRunDir = await getLatestRunDir();
  const previewsPath = path.join(latestRunDir, "marketplace_listings.json");

  const previews = await readJson(previewsPath);
  console.log(`Importing ${previews.length} listing previews from ${latestRunDir}`);

  let created = 0, updated = 0;

  for (const preview of previews) {
    // Generate UUID if this is a new preview
    const id = randomUUID();

    const link = preview.link;
    const title = preview.title || "Untitled";
    const price = preview.price || "N/A";
    const location = preview.location || null;
    const imageUrl = preview.image_url || null;

    // Upsert using link as unique key
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
        detailsScrapedAt: null, // Not scraped yet
      },
      update: {
        // Update these fields on re-scrape
        title,
        price,
        location,
        imageUrl,
        lastSeenAt: new Date(), // Update last seen time
        // Note: Don't update detailsScrapedAt - keep the original timestamp
      },
    });

    // Check if created or updated based on whether ID matches
    if (res.id === id) {
      created++;
    } else {
      updated++;
    }
  }

  console.log(`ListingPreviews upserted -> created: ${created}, updated: ${updated}`);
  console.log(`\nNext steps:`);
  console.log(`- ${created} new listings discovered`);
  console.log(`- Run detail scraper on listings where detailsScrapedAt IS NULL`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
