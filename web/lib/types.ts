export interface Listing {
  id: string;
  title: string;
  price: string;
  description: string | null;
  condition: string | null;
  location: string | null;
  imageUrls: string[];
  sourceUrl: string;
  listedAt: string | null;
  scrapedAt: string;
  priceEstimate: PriceEstimate | null;
}

export interface PriceEstimate {
  estimatedPrice: string | null;
}
