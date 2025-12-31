import { promises as fs } from "fs";
import path from "path";
import ListingCard from "@/components/ListingCard";

interface Listing {
  uuid: string;
  listing_id: string;
  url: string;
  title: string;
  price: string;
  location: string;
  description: string;
  condition: string;
  image_urls: string[];
  image_count: number;
  original_thumbnail: string;
  original_preview_data: {
    price: string;
    title: string;
    location: string;
  };
}

interface PriceEstimate {
  uuid: string;
  estimated_price?: string;
}

async function getLatestRun(): Promise<string | null> {
  const scrapedDataDir = path.join(
    process.cwd(),
    "..",
    "selenium",
    "scraped_data"
  );

  try {
    const entries = await fs.readdir(scrapedDataDir, { withFileTypes: true });
    const runs = entries
      .filter((e) => e.isDirectory() && /^\d{4}-\d{2}-\d{2}/.test(e.name))
      .map((e) => e.name)
      .sort();

    return runs.length > 0 ? runs[runs.length - 1] : null;
  } catch {
    return null;
  }
}

async function getListings(): Promise<Listing[]> {
  const latestRun = await getLatestRun();
  if (!latestRun) {
    console.error("No run folders found");
    return [];
  }

  const filePath = path.join(
    process.cwd(),
    "..",
    "selenium",
    "scraped_data",
    latestRun,
    "detailed_listings.json"
  );

  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    console.error("Error loading listings:", error);
    return [];
  }
}

async function getPriceEstimates(): Promise<Record<string, PriceEstimate>> {
  const responsesDir = path.join(process.cwd(), "..", "ai", "responses");

  try {
    const files = await fs.readdir(responsesDir);
    const priceFiles = files
      .filter((f) => f.startsWith("price_estimates_") && f.endsWith(".json"))
      .sort();

    if (priceFiles.length === 0) return {};

    const latestFile = priceFiles[priceFiles.length - 1];
    const filePath = path.join(responsesDir, latestFile);
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data);
  } catch (error) {
    return {};
  }
}

export default async function Home() {
  const listings = await getListings();
  const priceEstimates = await getPriceEstimates();

  return (
    <main className="main">
      <header className="header">
        <h1>Marketplace</h1>
        <p className="subtitle">{listings.length} listings available</p>
      </header>

      <div className="listings-grid">
        {listings.map((listing) => (
          <ListingCard
            key={listing.listing_id}
            listing={listing}
            aiPrice={priceEstimates[listing.uuid]?.estimated_price}
          />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="empty-state">
          <p>No listings found</p>
          <p className="hint">
            Run the scraper to populate listings data
          </p>
        </div>
      )}
    </main>
  );
}
