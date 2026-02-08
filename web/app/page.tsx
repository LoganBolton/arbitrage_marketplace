import ListingCard from "@/components/ListingCard";
import ScrapeButton from "@/components/ScrapeButton";
import prisma from "@/lib/prisma";
import { Listing } from "@/lib/types";

async function getListings(): Promise<Listing[]> {
  const rows = await prisma.listing.findMany({
    include: { priceEstimate: true },
    orderBy: { scrapedAt: "desc" },
  });

  return rows.map((l) => ({
    id: l.id,
    title: l.title,
    price: l.price,
    description: l.description,
    condition: l.condition,
    location: l.location,
    imageUrls: l.imageUrls ?? [],
    sourceUrl: l.sourceUrl,
    listedAt: l.listedAt?.toISOString() ?? null,
    scrapedAt: l.scrapedAt.toISOString(),
    priceEstimate: l.priceEstimate
      ? { estimatedPrice: l.priceEstimate.estimatedPrice }
      : null,
  }));
}

export default async function Home() {
  const listings = await getListings();

  return (
    <main className="main">
      <header className="header">
        <div className="header-row">
          <div>
            <h1>Marketplace</h1>
            <p className="subtitle">{listings.length} listings available</p>
          </div>
          <ScrapeButton />
        </div>
      </header>

      <div className="listings-grid">
        {listings.map((listing) => (
          <ListingCard key={listing.id} listing={listing} />
        ))}
      </div>

      {listings.length === 0 && (
        <div className="empty-state">
          <p>No listings found</p>
          <p className="hint">
            Add data to the database to populate listings
          </p>
        </div>
      )}
    </main>
  );
}
