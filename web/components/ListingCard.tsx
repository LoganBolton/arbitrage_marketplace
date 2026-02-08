"use client";

import Image from "next/image";
import { useState } from "react";
import { Listing } from "@/lib/types";

function parsePrice(priceStr: string): number | null {
  const match = priceStr.replace(/,/g, "").match(/\$?([\d.]+)/);
  return match ? parseFloat(match[1]) : null;
}

export default function ListingCard({ listing }: { listing: Listing }) {
  const [imageError, setImageError] = useState(false);

  const displayTitle = listing.title || "No Title";
  const displayPrice = listing.price || "Price not listed";
  const displayLocation = listing.location || "";
  const imageUrl = listing.imageUrls?.[0] || null;
  const aiPrice = listing.priceEstimate?.estimatedPrice;

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
      href={listing.sourceUrl}
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
        {listing.imageUrls.length > 1 && (
          <div className="image-count">{listing.imageUrls.length} photos</div>
        )}
      </div>
      <div className="listing-info">
        <div className="listing-price">{displayPrice}</div>
        {aiPrice && (
          <div className={priceClass}>Estimated: {aiPrice}</div>
        )}
        <div className="listing-title">{displayTitle}</div>
        <div className="listing-location">{displayLocation}</div>
        {listing.condition && (
          <div className="listing-condition">{listing.condition}</div>
        )}
      </div>
    </a>
  );
}
