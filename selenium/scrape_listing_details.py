import json
import time
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


def scrape_listing_details(driver, listing_url, listing_id, html_dir=None):
    """Scrape detailed information from a single listing page"""
    try:
        print(f"\nScraping listing {listing_id}...")
        driver.get(listing_url)
        time.sleep(3)  # Wait for page to load

        listing_data = {
            "listing_id": listing_id,
            "url": listing_url,
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        # Save raw HTML for debugging
        if html_dir:
            html_file = html_dir / f"{listing_id}.html"
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(driver.page_source)
            listing_data["html_file"] = str(html_file)
            print(f"Saved HTML to {html_file.name}")

        # Extract title
        try:
            title_selectors = [
                'span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6',
                'h1 span',
                'div[role="heading"] span'
            ]
            for selector in title_selectors:
                try:
                    title_elem = driver.find_element(By.CSS_SELECTOR, selector)
                    if title_elem.text:
                        listing_data["title"] = title_elem.text
                        print(f"Title: {title_elem.text}")
                        break
                except:
                    continue
            if "title" not in listing_data:
                listing_data["title"] = "N/A"
        except:
            listing_data["title"] = "N/A"

        # Extract price
        try:
            price_elems = driver.find_elements(By.CSS_SELECTOR, 'span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.xudqn12.x676frb.x1lkfr7t.x1lbecb7.x1s688f.xzsf02u')
            listing_data["price"] = price_elems[0].text if price_elems else "N/A"
        except:
            listing_data["price"] = "N/A"

        # Extract location
        try:
            location_elems = driver.find_elements(By.CSS_SELECTOR, 'span.x1lliihq.x6ikm8r.x10wlt62.x1n2onr6.xlyipyv.xuxw1ft')
            for elem in location_elems:
                text = elem.text
                if any(state in text for state in ["AL", "GA", "FL", "TX", "NY", "CA", "NC", "SC", "TN", "VA", "MS", "LA", "AR"]):
                    listing_data["location"] = text
                    break
            if "location" not in listing_data:
                listing_data["location"] = "N/A"
        except:
            listing_data["location"] = "N/A"

        # Extract description - try multiple approaches
        try:
            description = "N/A"

            # Method 1: Look for description in specific divs
            desc_selectors = [
                'div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a',
                'div.x1iorvi4.x4uap5.xjkvuk6.xkhd6sd',
                'div[style*="text-align: start"]'
            ]

            for selector in desc_selectors:
                try:
                    desc_elem = driver.find_element(By.CSS_SELECTOR, selector)
                    if desc_elem.text and len(desc_elem.text) > 10:
                        description = desc_elem.text
                        break
                except:
                    continue

            # Method 2: Look for longer text spans
            if description == "N/A":
                all_spans = driver.find_elements(By.TAG_NAME, 'span')
                for span in all_spans:
                    text = span.text
                    if text and len(text) > 50 and text != listing_data.get("title"):
                        description = text
                        break

            listing_data["description"] = description
            if description != "N/A":
                print(f"Description: {description[:100]}...")
        except:
            listing_data["description"] = "N/A"

        # Extract condition
        try:
            condition_elems = driver.find_elements(By.XPATH, '//span[contains(text(), "Condition")]/following-sibling::span')
            if not condition_elems:
                condition_elems = driver.find_elements(By.XPATH, '//div[contains(text(), "Condition")]/..//span[not(contains(text(), "Condition"))]')
            listing_data["condition"] = condition_elems[0].text if condition_elems else "N/A"
        except:
            listing_data["condition"] = "N/A"

        # Extract category
        try:
            category_elems = driver.find_elements(By.XPATH, '//span[contains(text(), "Category")]/following-sibling::span')
            if not category_elems:
                category_elems = driver.find_elements(By.XPATH, '//div[contains(text(), "Category")]/..//span[not(contains(text(), "Category"))]')
            listing_data["category"] = category_elems[0].text if category_elems else "N/A"
        except:
            listing_data["category"] = "N/A"

        # Extract seller name
        try:
            seller_selectors = [
                'a.x1i10hfl.xjbqb8w.x1ejq31n.xd10rxx.x1sy0etr.x17r0tee.x972fbf.xcfux6l.x1qhh985.xm0m39n.x9f619',
                'a[role="link"] span',
                'div[role="article"] a span'
            ]
            seller_name = "N/A"
            for selector in seller_selectors:
                try:
                    seller_elem = driver.find_element(By.CSS_SELECTOR, selector)
                    if seller_elem.text and len(seller_elem.text) > 1:
                        seller_name = seller_elem.text
                        break
                except:
                    continue
            listing_data["seller_name"] = seller_name
        except:
            listing_data["seller_name"] = "N/A"

        # Extract seller location (separate from item location)
        try:
            seller_location_elems = driver.find_elements(By.XPATH, '//span[contains(text(), "Member since")]/../following-sibling::div//span')
            listing_data["seller_location"] = seller_location_elems[0].text if seller_location_elems else "N/A"
        except:
            listing_data["seller_location"] = "N/A"

        # Extract all images (only from the listing gallery container)
        image_urls = []
        try:
            # Find the main listing image gallery container using the specific class combination
            gallery_container = driver.find_elements(By.CSS_SELECTOR, 'div.x6s0dn4.x78zum5.x1y1aw1k.xwib8y2.xu6gjpd.x11xpdln.x1r7x56h.xuxw1ft.xc9qbxq.xw2csxc.x10wlt62.xish69e')

            if gallery_container:
                print(f"Found listing image container")
                # Get all images within this specific container
                img_elements = gallery_container[0].find_elements(By.TAG_NAME, 'img')

                for img in img_elements:
                    try:
                        src = img.get_attribute('src')
                        if src and 'scontent' in src and src not in image_urls:
                            # Exclude profile pictures
                            if 'profile' not in src.lower():
                                image_urls.append(src)
                    except:
                        continue
            else:
                print("Warning: Could not find listing image container with expected class")

            # Remove duplicates while preserving order
            seen = set()
            unique_images = []
            for url in image_urls:
                # Create a simplified version of URL for comparison (remove query params that might differ)
                url_base = url.split('?')[0]
                if url_base not in seen:
                    seen.add(url_base)
                    unique_images.append(url)

            listing_data["image_urls"] = unique_images
            listing_data["image_count"] = len(unique_images)
            print(f"Found {len(unique_images)} images")
        except Exception as e:
            print(f"Error extracting images: {e}")
            listing_data["image_urls"] = []
            listing_data["image_count"] = 0

        # Extract additional details/attributes
        listing_data["attributes"] = {}
        try:
            # Look for attribute pairs (label: value)
            attribute_containers = driver.find_elements(By.XPATH, '//div[contains(@class, "x78zum5")]')

            for container in attribute_containers:
                try:
                    spans = container.find_elements(By.TAG_NAME, 'span')
                    if len(spans) >= 2:
                        label = spans[0].text
                        value = spans[1].text
                        if label and value and label != value and len(label) < 50:
                            listing_data["attributes"][label] = value
                except:
                    continue
        except:
            pass

        # Extract listing posted date
        try:
            date_elems = driver.find_elements(By.XPATH, '//span[contains(text(), "Listed")]')
            if date_elems:
                listing_data["posted_date"] = date_elems[0].text
            else:
                listing_data["posted_date"] = "N/A"
        except:
            listing_data["posted_date"] = "N/A"

        # Extract availability status
        try:
            status_elems = driver.find_elements(By.XPATH, '//*[contains(text(), "Available") or contains(text(), "Sold") or contains(text(), "Pending")]')
            listing_data["availability"] = status_elems[0].text if status_elems else "Unknown"
        except:
            listing_data["availability"] = "Unknown"

        return listing_data

    except Exception as e:
        print(f"Error scraping listing {listing_id}: {e}")
        return {
            "listing_id": listing_id,
            "url": listing_url,
            "error": str(e),
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }


def main():
    # Setup paths
    script_dir = Path(__file__).parent
    input_file = script_dir / "scraped_data" / "marketplace_listings.json"
    output_dir = script_dir / "scraped_data" / "detailed_listings"
    html_dir = output_dir / "raw_html"

    # Create output directories
    output_dir.mkdir(exist_ok=True)
    html_dir.mkdir(exist_ok=True)

    # Load existing listings
    print(f"Loading listings from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        listings = json.load(f)

    print(f"Found {len(listings)} listings to scrape")

    # Setup Chrome driver
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)

    detailed_listings = []

    try:
        for idx, listing in enumerate(listings):
            listing_id = f"listing_{idx + 1:03d}"
            listing_url = listing.get("link", "")

            if not listing_url:
                print(f"Skipping listing {listing_id} - no URL")
                continue

            # Scrape details
            detailed_data = scrape_listing_details(driver, listing_url, listing_id, html_dir)

            # Merge with original listing data
            detailed_data["original_thumbnail"] = listing.get("image_url")
            detailed_data["original_preview_data"] = {
                "price": listing.get("price"),
                "title": listing.get("title"),
                "location": listing.get("location")
            }

            detailed_listings.append(detailed_data)

            # Save progress after each listing
            progress_file = output_dir / "detailed_listings_progress.json"
            with open(progress_file, 'w', encoding='utf-8') as f:
                json.dump(detailed_listings, f, indent=2, ensure_ascii=False)

            # Rate limiting to avoid being blocked
            time.sleep(3)

            print(f"Progress: {idx + 1}/{len(listings)} listings completed")

        # Save final results
        output_file = output_dir / "detailed_listings.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(detailed_listings, f, indent=2, ensure_ascii=False)

        print(f"\n{'='*60}")
        print(f"Scraping Complete!")
        print(f"{'='*60}")
        print(f"Total listings scraped: {len(detailed_listings)}")
        print(f"Data saved to: {output_file}")
        print(f"Raw HTML files saved to: {html_dir}")

        # Print summary statistics
        total_images = sum(listing.get("image_count", 0) for listing in detailed_listings)
        with_description = sum(1 for listing in detailed_listings if listing.get("description") != "N/A")
        with_condition = sum(1 for listing in detailed_listings if listing.get("condition") != "N/A")

        print(f"\nSummary Statistics:")
        print(f"  Total image URLs collected: {total_images}")
        print(f"  Average images per listing: {total_images / len(detailed_listings):.1f}")
        print(f"  Listings with descriptions: {with_description}/{len(detailed_listings)}")
        print(f"  Listings with condition info: {with_condition}/{len(detailed_listings)}")

    except KeyboardInterrupt:
        print("\n\nScraping interrupted by user. Saving progress...")
        output_file = output_dir / "detailed_listings_interrupted.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(detailed_listings, f, indent=2, ensure_ascii=False)
        print(f"Partial data saved to: {output_file}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
