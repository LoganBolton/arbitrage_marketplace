#!/usr/bin/env node
import { PrismaClient } from "@prisma/client";
import fs from "node:fs/promises";
import path from "node:path";

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
  const listingsPath = path.join(latestRunDir, "detailed_listings.json");

  const respDir = path.join(process.cwd(), "..", "ai", "responses");
  let prices = {};
  try {
    const files = await fs.readdir(respDir);
    const priceFiles = files.filter((f) => f.startsWith("price_estimates_") && f.endsWith(".json")).sort();
    if (priceFiles.length) {
      prices = await readJson(path.join(respDir, priceFiles[priceFiles.length - 1]));
    }
  } catch {}

  const listings = await readJson(listingsPath);
  console.log(`Importing ${listings.length} listings`);
  let created = 0, updated = 0, peUpserts = 0;

  for (const l of listings) {
    const id = l.uuid;
    const title = l.title && l.title !== "N/A" ? l.title : (l.original_preview_data?.title ?? "Untitled");
    const price = l.price && l.price !== "N/A" ? l.price : (l.original_preview_data?.price ?? "N/A");
    const location = l.location && l.location !== "N/A" ? l.location : (l.original_preview_data?.location ?? null);
    const description = l.description && l.description !== "N/A" ? l.description : null;
    const condition = l.condition && l.condition !== "N/A" ? l.condition : null;
    const imageUrls = Array.isArray(l.image_urls) ? l.image_urls : [];
    const sourceUrl = l.url;

    const res = await prisma.listing.upsert({
      where: { sourceUrl },
      create: {
        id,
        title,
        price,
        description,
        condition,
        location,
        imageUrls,
        sourceUrl,
        scrapedAt: l.scraped_at ? new Date(l.scraped_at) : undefined,
      },
      update: {
        title,
        price,
        description,
        condition,
        location,
        imageUrls,
      },
    });
    if (res.id === id) created++; else updated++;

    const pe = prices[id];
    if (pe) {
      await prisma.priceEstimate.upsert({
        where: { listingId: id },
        create: {
          listingId: id,
          estimatedPrice: pe.estimated_price ?? null,
          aiResponse: pe.ai_response ?? null,
        },
        update: {
          estimatedPrice: pe.estimated_price ?? null,
          aiResponse: pe.ai_response ?? null,
        },
      });
      peUpserts++;
    }
  }

  console.log(`Listings upserted -> created: ${created}, updated: ${updated}`);
  console.log(`PriceEstimates upserted: ${peUpserts}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

