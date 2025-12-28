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
}

export default function ListingCard({ listing }: ListingCardProps) {
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
        <div className="listing-title">{displayTitle}</div>
        <div className="listing-location">{displayLocation}</div>
        {listing.condition && listing.condition !== "N/A" && (
          <div className="listing-condition">{listing.condition}</div>
        )}
      </div>
    </a>
  );
}
