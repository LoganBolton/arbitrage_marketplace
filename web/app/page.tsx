import ListingCard from "@/components/ListingCard";
import prisma from "@/lib/prisma";

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

type ListingWithAi = Listing & { aiPrice?: string };

async function getListingsFromDb(): Promise<ListingWithAi[]> {
  const rows = await prisma.listing.findMany({
    include: { priceEstimate: true },
    orderBy: { scrapedAt: "desc" },
  });

  return rows.map((l) => {
    const location = l.location ?? "";
    const description = l.description ?? "N/A";
    const condition = l.condition ?? "";
    const imageUrls = l.imageUrls ?? [];

    const listing: Listing = {
      uuid: l.id,
      listing_id: l.id,
      url: l.sourceUrl,
      title: l.title,
      price: l.price,
      location,
      description,
      condition,
      image_urls: imageUrls,
      image_count: imageUrls.length,
      original_thumbnail: "",
      original_preview_data: {
        price: l.price,
        title: l.title,
        location,
      },
    };

    return {
      ...listing,
      aiPrice: l.priceEstimate?.estimatedPrice ?? undefined,
    };
  });
}

export default async function Home() {
  const listings = await getListingsFromDb();

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
            aiPrice={(listing as ListingWithAi).aiPrice}
          />
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
