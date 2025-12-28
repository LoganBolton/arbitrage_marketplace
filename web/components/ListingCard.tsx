"use client";

import Image from "next/image";
import { useState } from "react";

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

interface ListingCardProps {
  listing: Listing;
  aiPrice?: string;
}

function parsePrice(priceStr: string): number | null {
  // Extract first number from price string (e.g., "$100" -> 100, "$100 - $150" -> 100)
  const match = priceStr.replace(/,/g, "").match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export default function ListingCard({ listing, aiPrice }: ListingCardProps) {
  const [imageError, setImageError] = useState(false);

  const displayTitle =
    listing.title !== "N/A"
      ? listing.title
      : listing.original_preview_data?.title || "No Title";

  const displayPrice =
    listing.price !== "N/A"
      ? listing.price
      : listing.original_preview_data?.price || "Price not listed";

  const displayLocation =
    listing.location !== "N/A"
      ? listing.location
      : listing.original_preview_data?.location || "";

  const imageUrl =
    listing.image_urls?.[0] || listing.original_thumbnail || null;

  // Determine if AI price is higher or lower than listed price
  let priceClass = "listing-ai-price";
  if (aiPrice) {
    const listedNum = parsePrice(displayPrice);
    const aiNum = parsePrice(aiPrice);
    if (listedNum !== null && aiNum !== null) {
      priceClass = aiNum > listedNum ? "listing-ai-price-green" : "listing-ai-price-red";
    }
  }

  return (
    <a
      href={listing.url}
      target="_blank"
      rel="noopener noreferrer"
      className="listing-card"
    >
      <div className="listing-image-container">
        {imageUrl && !imageError ? (
          <Image
            src={imageUrl}
            alt={displayTitle}
            fill
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 20vw"
            className="listing-image"
            onError={() => setImageError(true)}
          />
        ) : (
          <div className="listing-image-placeholder">
            <span>No Image</span>
          </div>
        )}
        {listing.image_count > 1 && (
          <div className="image-count">{listing.image_count} photos</div>
        )}
      </div>
      <div className="listing-info">
        <div className="listing-price">{displayPrice}</div>
        {aiPrice && (
          <div className={priceClass}>Estimated: {aiPrice}</div>
        )}
        <div className="listing-title">{displayTitle}</div>
        <div className="listing-location">{displayLocation}</div>
        {listing.condition && listing.condition !== "N/A" && (
          <div className="listing-condition">{listing.condition}</div>
        )}
      </div>
    </a>
  );
}
