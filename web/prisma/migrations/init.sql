-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateTable
CREATE TABLE "Listing" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "price" TEXT NOT NULL,
    "description" TEXT,
    "condition" TEXT,
    "location" TEXT,
    "imageUrls" TEXT[],
    "sourceUrl" TEXT NOT NULL,
    "listedAt" TIMESTAMP(3),
    "scrapedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Listing_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PriceEstimate" (
    "id" TEXT NOT NULL,
    "estimatedPrice" TEXT,
    "aiResponse" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "listingId" TEXT NOT NULL,

    CONSTRAINT "PriceEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Listing_sourceUrl_key" ON "Listing"("sourceUrl");

-- CreateIndex
CREATE UNIQUE INDEX "PriceEstimate_listingId_key" ON "PriceEstimate"("listingId");

-- AddForeignKey
ALTER TABLE "PriceEstimate" ADD CONSTRAINT "PriceEstimate_listingId_fkey" FOREIGN KEY ("listingId") REFERENCES "Listing"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

