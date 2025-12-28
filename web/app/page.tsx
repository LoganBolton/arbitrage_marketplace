import { promises as fs } from "fs";
import path from "path";
import ListingCard from "@/components/ListingCard";

interface Listing {
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

export default async function Home() {
  const listings = await getListings();

  return (
    <main className="main">
      <header className="header">
        <h1>Marketplace</h1>
        <p className="subtitle">{listings.length} listings available</p>
      </header>

      <div className="listings-grid">
        {listings.map((listing) => (
          <ListingCard key={listing.listing_id} listing={listing} />
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
