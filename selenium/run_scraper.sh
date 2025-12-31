#!/bin/bash
# Marketplace Scraper - runs extract + detailed back-to-back

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

LOG_FILE="$SCRIPT_DIR/scraped_data/scraper.log"

echo "========================================" >> "$LOG_FILE"
echo "Starting scrape at $(date)" >> "$LOG_FILE"

# Run initial extract
echo "Running listings extract..." >> "$LOG_FILE"
python3 scrape_listings.py >> "$LOG_FILE" 2>&1

if [ $? -eq 0 ]; then
    echo "Extract complete. Running detailed scraper..." >> "$LOG_FILE"
    python3 scrape_listing_details.py >> "$LOG_FILE" 2>&1

    if [ $? -eq 0 ]; then
        echo "Scrape completed successfully at $(date)" >> "$LOG_FILE"
    else
        echo "ERROR: Detailed scraper failed at $(date)" >> "$LOG_FILE"
    fi
else
    echo "ERROR: Listings extract failed at $(date)" >> "$LOG_FILE"
fi

echo "" >> "$LOG_FILE"
