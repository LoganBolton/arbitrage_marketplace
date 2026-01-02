#!/usr/bin/env node
import fs from "node:fs/promises";
import path from "node:path";

function csvEscape(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n]/.test(s)) return '"' + s.replace(/"/g, '""') + '"';
  return s;
}

function toPgTextArray(arr) {
  const items = (arr || []).map((u) => '"' + String(u).replace(/"/g, '\\"') + '"');
  return `{${items.join(",")}}`;
}

async function getLatestRunDir() {
  const base = path.join(process.cwd(), "..", "selenium", "scraped_data");
  const entries = await fs.readdir(base, { withFileTypes: true });
  const runs = entries
    .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
    .map((e) => e.name)
    .sort();
  if (!runs.length) throw new Error("No scraped runs found in selenium/scraped_data");
  return { base, latest: runs[runs.length - 1] };
}

async function readJson(file) {
  const s = await fs.readFile(file, "utf-8");
  return JSON.parse(s);
}

async function exportListings() {
  const { base, latest } = await getLatestRunDir();
  const listingsPath = path.join(base, latest, "detailed_listings.json");
  const listings = await readJson(listingsPath);

  const out = [];
  out.push(["id","title","price","description","condition","location","imageUrls","sourceUrl","scrapedAt"].join(","));

  for (const l of listings) {
    const title = l.title && l.title !== "N/A" ? l.title : (l.original_preview_data?.title ?? "");
    const price = l.price && l.price !== "N/A" ? l.price : (l.original_preview_data?.price ?? "");
    const location = l.location && l.location !== "N/A" ? l.location : (l.original_preview_data?.location ?? "");
    const description = l.description === "N/A" ? null : (l.description ?? null);
    const condition = l.condition === "N/A" ? null : (l.condition ?? null);
    const imageArr = Array.isArray(l.image_urls) ? l.image_urls : [];
    const row = [
      csvEscape(l.uuid),
      csvEscape(title),
      csvEscape(price),
      csvEscape(description),
      csvEscape(condition),
      csvEscape(location),
      csvEscape(toPgTextArray(imageArr)),
      csvEscape(l.url),
      csvEscape(l.scraped_at || ""),
    ];
    out.push(row.join(","));
  }

  const dest = path.join(process.cwd(), "listings.csv");
  await fs.writeFile(dest, out.join("\n"), "utf-8");
  console.log(`Wrote ${dest} (${listings.length} rows)`);
}

async function exportPriceEstimates() {
  const respDir = path.join(process.cwd(), "..", "ai", "responses");
  const files = await fs.readdir(respDir);
  const priceFiles = files.filter((f) => f.startsWith("price_estimates_") && f.endsWith(".json")).sort();
  if (!priceFiles.length) {
    console.log("No price_estimates_*.json found; skipping price export");
    return;
  }
  const latest = priceFiles[priceFiles.length - 1];
  const prices = await readJson(path.join(respDir, latest));

  const out = [];
  // Include an id column so imports won't try to insert NULL into a NOT NULL primary key
  out.push(["id","estimatedPrice","aiResponse","listingId"].join(","));
  for (const [listingId, v] of Object.entries(prices)) {
    // Use the listing UUID as the PriceEstimate.id as well (1:1 relationship)
    const peId = listingId;
    out.push([
      csvEscape(peId),
      csvEscape(v.estimated_price ?? ""),
      csvEscape(v.ai_response ?? ""),
      csvEscape(listingId),
    ].join(","));
  }
  const dest = path.join(process.cwd(), "price_estimates.csv");
  await fs.writeFile(dest, out.join("\n"), "utf-8");
  console.log(`Wrote ${dest} (${Object.keys(prices).length} rows)`);
}

async function main() {
  await exportListings();
  await exportPriceEstimates();
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
