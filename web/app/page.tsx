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

async function getListings(): Promise<Listing[]> {
  const filePath = path.join(
    process.cwd(),
    "..",
    "selenium",
    "scraped_data",
    "detailed_listings",
    "detailed_listings_progress.json"
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
  const filePath = path.join(
    process.cwd(),
    "..",
    "ai",
    "responses",
    "price_estimates.json"
  );

  try {
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
