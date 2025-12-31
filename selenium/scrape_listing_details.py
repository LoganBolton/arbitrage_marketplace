import argparse
import json
import re
import time
import uuid
from datetime import datetime, timedelta
from concurrent.futures import ThreadPoolExecutor, as_completed
from pathlib import Path
from threading import Lock
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC


# Thread-safe progress tracking
progress_lock = Lock()
completed_count = 0


def parse_relative_date(posted_date_str):
    """Parse relative date string and return calculated date"""
    if not posted_date_str or posted_date_str == "N/A":
        return None

    today = datetime.now()
    text = posted_date_str.lower()

    # Extract the relative time part
    # e.g., "Listed 2 weeks ago in Auburn, AL" -> "2 weeks ago"

    if "today" in text:
        return today.strftime("%Y-%m-%d")

    if "yesterday" in text:
        return (today - timedelta(days=1)).strftime("%Y-%m-%d")

    # Match patterns like "X minutes/hours/days/weeks/months ago"
    match = re.search(r'(\d+)\s*(minute|hour|day|week|month)s?\s*ago', text)
    if match:
        amount = int(match.group(1))
        unit = match.group(2)

        if unit == "minute":
            calculated = today - timedelta(minutes=amount)
        elif unit == "hour":
            calculated = today - timedelta(hours=amount)
        elif unit == "day":
            calculated = today - timedelta(days=amount)
        elif unit == "week":
            calculated = today - timedelta(weeks=amount)
        elif unit == "month":
            calculated = today - timedelta(days=amount * 30)  # Approximate
        else:
            return None

        return calculated.strftime("%Y-%m-%d")

    # Handle "a week ago", "an hour ago", etc.
    if re.search(r'\b(a|an)\s+week\s+ago', text):
        return (today - timedelta(weeks=1)).strftime("%Y-%m-%d")
    if re.search(r'\b(a|an)\s+month\s+ago', text):
        return (today - timedelta(days=30)).strftime("%Y-%m-%d")
    if re.search(r'\b(a|an)\s+day\s+ago', text):
        return (today - timedelta(days=1)).strftime("%Y-%m-%d")
    if re.search(r'\b(a|an)\s+hour\s+ago', text):
        return (today - timedelta(hours=1)).strftime("%Y-%m-%d")

    return None


def create_chrome_driver():
    """Create a new Chrome driver instance"""
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--disable-gpu")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
    return webdriver.Chrome(options=chrome_options)


def scrape_listing_details(driver, listing_url, listing_id, listing_uuid=None, html_dir=None):
    """Scrape detailed information from a single listing page"""
    try:
        print(f"\nScraping listing {listing_id}...")
        driver.get(listing_url)

        # Wait for page to load properly - try to wait for key elements
        try:
            WebDriverWait(driver, 10).until(
                EC.presence_of_element_located((By.CSS_SELECTOR, 'img[src*="scontent"]'))
            )
        except:
            pass  # Continue anyway if timeout

        # Additional wait for dynamic content
        time.sleep(2)

        # Generate UUID if not provided
        if listing_uuid is None:
            listing_uuid = str(uuid.uuid4())

        listing_data = {
            "uuid": listing_uuid,
            "listing_id": listing_id,
            "url": listing_url,
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
        }

        # Save raw HTML for debugging
        if html_dir:
            html_file = html_dir / f"{listing_id}.html"
            with open(html_file, 'w', encoding='utf-8') as f:
                f.write(driver.page_source)
            listing_data["html_file"] = f"raw_html/{listing_id}.html"
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

        # Extract location - will be updated later from seller_location for accuracy
        listing_data["location"] = "N/A"

        # Extract description - try multiple approaches
        try:
            description = "N/A"
            title = listing_data.get("title", "")

            # Method 1: Extract from og:description meta tag (most reliable - has full text)
            try:
                og_desc = driver.find_element(By.CSS_SELECTOR, 'meta[property="og:description"]')
                content = og_desc.get_attribute('content')
                if content and len(content) > 5:
                    description = content
                    print(f"Got description from og:description meta tag")
            except:
                pass

            # Method 2: Look for "See more" button and get parent container's text (fallback)
            if description == "N/A":
                try:
                    see_more_elems = driver.find_elements(By.XPATH, '//span[contains(text(), "See more")]')
                    for see_more in see_more_elems:
                        try:
                            # Get the parent container that holds the description
                            parent = see_more.find_element(By.XPATH, './ancestor::div[contains(@class, "x1iorvi4") or contains(@class, "xz9dl7a")]')
                            if parent:
                                text = parent.text.replace("See more", "").strip()
                                if text and len(text) > 10:
                                    description = text
                                    break
                        except:
                            continue
                except:
                    pass

            # Method 3: Look for description div after the listing details section
            if description == "N/A":
                desc_selectors = [
                    'div.xz9dl7a.x4uap5.xsag5q8.xkhd6sd.x126k92a',
                    'div.x1iorvi4.x4uap5.xjkvuk6.xkhd6sd',
                    'div[style*="text-align: start"]'
                ]
                for selector in desc_selectors:
                    try:
                        desc_elems = driver.find_elements(By.CSS_SELECTOR, selector)
                        for desc_elem in desc_elems:
                            text = desc_elem.text
                            # Filter out sidebar content (contains "Today's picks" or many $ signs or location lists)
                            if text and len(text) > 10:
                                if "Today's picks" in text or text.count('$') > 3 or text.count('\n') > 10:
                                    continue
                                # Make sure it's not just the title repeated
                                if text.strip() != title.strip():
                                    description = text
                                    break
                        if description != "N/A":
                            break
                    except:
                        continue

            # Method 4: Look for spans with description-like content
            if description == "N/A":
                try:
                    # Find all spans and look for ones that look like descriptions
                    spans = driver.find_elements(By.CSS_SELECTOR, 'span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.x1xmvt09.x1lliihq.x1s928wv.xhkezso.x1gmr53x.x1cpjm7i.x1fgarty.x1943h6x.x4zkp8e.x676frb.x1nxh6w3.x1sibtaa.xo1l8bm.xi81zsa')
                    for span in spans:
                        text = span.text
                        if text and len(text) > 20 and text != title:
                            # Filter out price-like or location-like content
                            if not text.startswith('$') and "Today's picks" not in text:
                                description = text
                                break
                except:
                    pass

            listing_data["description"] = description
            if description != "N/A":
                print(f"Description: {description[:100]}...")
        except:
            listing_data["description"] = "N/A"

        # Extract condition
        try:
            condition = "N/A"
            # Look for spans with the condition class that contain condition keywords
            condition_elems = driver.find_elements(By.CSS_SELECTOR, 'span.x193iq5w.xeuugli.x13faqbe.x1vvkbs.xlh3980.xvmahel.x1n0sxbx.x6prxxf.xvq8zen.xo1l8bm.xzsf02u')

            # Exact condition values to match (not partial matches in descriptions)
            valid_conditions = [
                "New", "New with tags", "New without tags", "New with box", "New without box",
                "Used - Like new", "Used - Good", "Used - Fair", "Used - Acceptable",
                "Used", "Like new", "Fair", "Good", "Excellent",
                "For parts or not working", "For parts", "Refurbished", "Pre-owned"
            ]

            for elem in condition_elems:
                text = elem.text.strip()
                # Only match if text is short (< 50 chars) and matches a valid condition exactly or starts with one
                if text and len(text) < 50:
                    if text in valid_conditions or any(text.startswith(vc) for vc in valid_conditions):
                        condition = text
                        break

            listing_data["condition"] = condition
        except:
            listing_data["condition"] = "N/A"

        # Extract all images using multiple methods for consistency
        image_urls = []
        try:
            # Method 1: Look for the main listing photo viewer (most reliable)
            # This targets the left panel where listing images are displayed
            try:
                # Find images in the main photo area - look for large images first
                main_images = driver.find_elements(By.CSS_SELECTOR, 'img[src*="scontent"][src*="s960x960"], img[src*="scontent"][src*="p960x960"], img[src*="scontent"][src*="p720x720"]')
                for img in main_images:
                    src = img.get_attribute('src')
                    if src and 'profile' not in src.lower():
                        image_urls.append(src)
                if image_urls:
                    print(f"Found {len(image_urls)} images via large image selector")
            except:
                pass

            # Method 2: Find gallery navigation dots to determine image count, then get visible images
            if not image_urls:
                try:
                    # Look for navigation dots that indicate multiple images
                    nav_dots = driver.find_elements(By.CSS_SELECTOR, 'div[role="tablist"] div[role="tab"]')
                    expected_count = len(nav_dots) if nav_dots else 1

                    # Find images in the visible photo container
                    photo_containers = driver.find_elements(By.CSS_SELECTOR, 'div[data-visualcompletion="media-vc-image"] img')
                    for img in photo_containers:
                        src = img.get_attribute('src')
                        if src and 'scontent' in src and 'profile' not in src.lower():
                            image_urls.append(src)

                    if image_urls:
                        print(f"Found {len(image_urls)} images via media container")
                except:
                    pass

            # Method 3: Look for preload links with large image dimensions only
            if not image_urls:
                try:
                    preload_links = driver.find_elements(By.CSS_SELECTOR, 'link[rel="preload"][as="image"]')
                    for link in preload_links[:10]:  # Limit to first 10 preload links
                        href = link.get_attribute('href')
                        if href and 'scontent' in href:
                            # Only accept large images (720 or 960 dimensions)
                            if ('p720x720' in href or 's960x960' in href or 'p960x960' in href):
                                if 'profile' not in href.lower() and 'emoji' not in href.lower():
                                    image_urls.append(href)
                    if image_urls:
                        print(f"Found {len(image_urls)} images via preload links")
                except:
                    pass

            # Method 4: Fallback - use broader search but limit results
            if not image_urls:
                try:
                    all_imgs = driver.find_elements(By.TAG_NAME, 'img')
                    for img in all_imgs[:20]:  # Limit search
                        src = img.get_attribute('src')
                        if src and 'scontent' in src:
                            if 'profile' not in src.lower() and 'emoji' not in src.lower():
                                # Check for reasonable size indicators in URL
                                if any(size in src for size in ['s960', 'p960', 'p720', 's720', 'p526x296']):
                                    image_urls.append(src)
                    if image_urls:
                        print(f"Found {len(image_urls)} images via img tag fallback")
                except:
                    pass

            # Remove duplicates while preserving order, using URL base for comparison
            seen = set()
            unique_images = []
            for url in image_urls:
                # Normalize URL for comparison - extract the unique image ID
                # Facebook image URLs have format: /v/xxx/IMAGE_ID_xxx.jpg
                match = re.search(r'/(\d+_\d+)', url)
                if match:
                    image_id = match.group(1)
                else:
                    image_id = url.split('?')[0]

                if image_id not in seen:
                    seen.add(image_id)
                    unique_images.append(url)

            listing_data["image_urls"] = unique_images
            listing_data["image_count"] = len(unique_images)
            print(f"Total unique images: {len(unique_images)}")
        except Exception as e:
            print(f"Error extracting images: {e}")
            listing_data["image_urls"] = []
            listing_data["image_count"] = 0


        # Extract listing posted date
        try:
            date_elems = driver.find_elements(By.XPATH, '//span[contains(text(), "Listed")]')
            if date_elems:
                listing_data["posted_date"] = date_elems[0].text
            else:
                listing_data["posted_date"] = "N/A"
        except:
            listing_data["posted_date"] = "N/A"

        # Calculate approximate listing date from relative date
        listing_data["calculated_listing_date"] = parse_relative_date(listing_data["posted_date"])

        # Extract location from posted_date (e.g., "Listed 2 weeks ago in Auburn, AL")
        try:
            posted = listing_data.get("posted_date", "")
            match = re.search(r'\bin\s+(.+)$', posted)
            listing_data["location"] = match.group(1).strip() if match else "N/A"
        except:
            listing_data["location"] = "N/A"

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


def scrape_single_listing(args):
    """Worker function for parallel scraping - creates its own driver"""
    global completed_count
    idx, listing, html_dir, total_count = args

    listing_id = f"listing_{idx + 1:03d}"
    listing_url = listing.get("link", "")

    if not listing_url:
        print(f"Skipping listing {listing_id} - no URL")
        return None

    driver = None
    try:
        # Create driver for this thread
        driver = create_chrome_driver()

        # Get or generate UUID
        listing_uuid = listing.get("uuid", str(uuid.uuid4()))

        # Scrape details
        detailed_data = scrape_listing_details(driver, listing_url, listing_id, listing_uuid, html_dir)

        # Merge with original listing data
        detailed_data["original_thumbnail"] = listing.get("image_url")
        detailed_data["original_preview_data"] = {
            "price": listing.get("price"),
            "title": listing.get("title"),
            "location": listing.get("location")
        }

        # Fallback: Use original thumbnail if no images were extracted
        if not detailed_data.get("image_urls") or len(detailed_data["image_urls"]) == 0:
            original_thumb = listing.get("image_url")
            if original_thumb:
                detailed_data["image_urls"] = [original_thumb]
                detailed_data["image_count"] = 1
                print(f"Used original thumbnail as fallback for {listing_id}")

        # Fallback: Use original price if not extracted
        if detailed_data.get("price") == "N/A" and listing.get("price"):
            detailed_data["price"] = listing.get("price")

        # Update progress
        with progress_lock:
            completed_count += 1
            print(f"Progress: {completed_count}/{total_count} listings completed")

        return (idx, detailed_data)

    except Exception as e:
        print(f"Error in worker for {listing_id}: {e}")
        return (idx, {
            "listing_id": listing_id,
            "url": listing_url,
            "error": str(e),
            "scraped_at": time.strftime("%Y-%m-%d %H:%M:%S")
        })
    finally:
        if driver:
            try:
                driver.quit()
            except:
                pass


def get_latest_run(scraped_data_dir):
    """Find the most recent timestamped run folder"""
    runs = [d for d in scraped_data_dir.iterdir()
            if d.is_dir() and d.name[0].isdigit()]
    if not runs:
        return None
    return max(runs, key=lambda x: x.name)


def main():
    global completed_count

    # Parse command line arguments
    parser = argparse.ArgumentParser(description='Scrape Facebook Marketplace listing details')
    parser.add_argument('--no-parallel', action='store_true', help='Disable parallel mode (run sequentially)')
    parser.add_argument('--workers', type=int, default=4, help='Number of parallel workers (default: 4)')
    parser.add_argument('--input', type=str, help='Timestamp folder to read from (e.g., 2025-12-30_143022). Uses latest if not specified.')
    args = parser.parse_args()

    parallel_mode = not args.no_parallel
    num_workers = args.workers

    # Setup paths
    script_dir = Path(__file__).parent
    scraped_data_dir = script_dir / "scraped_data"

    # Find input folder
    if args.input:
        run_dir = scraped_data_dir / args.input
        if not run_dir.exists():
            print(f"Error: Run folder '{args.input}' not found")
            return
    else:
        run_dir = get_latest_run(scraped_data_dir)
        if not run_dir:
            print("Error: No run folders found. Run scrape_listings.py first.")
            return
        print(f"Using latest run: {run_dir.name}")

    input_file = run_dir / "marketplace_listings.json"
    if not input_file.exists():
        print(f"Error: {input_file} not found")
        return

    output_dir = run_dir
    html_dir = output_dir / "raw_html"

    # Create output directories
    html_dir.mkdir(exist_ok=True)

    # Load existing listings
    print(f"Loading listings from {input_file}...")
    with open(input_file, 'r', encoding='utf-8') as f:
        listings = json.load(f)

    print(f"Found {len(listings)} listings to scrape")
    print(f"Mode: {'Parallel' if parallel_mode else 'Sequential'}")
    if parallel_mode:
        print(f"Workers: {num_workers}")

    detailed_listings = []
    completed_count = 0

    try:
        if parallel_mode:
            # Parallel mode using ThreadPoolExecutor
            work_items = [(idx, listing, html_dir, len(listings)) for idx, listing in enumerate(listings)]

            with ThreadPoolExecutor(max_workers=num_workers) as executor:
                futures = {executor.submit(scrape_single_listing, item): item for item in work_items}

                results = {}
                for future in as_completed(futures):
                    try:
                        result = future.result()
                        if result:
                            idx, data = result
                            results[idx] = data
                    except Exception as e:
                        print(f"Future failed: {e}")

                # Sort results by index to maintain order
                for idx in sorted(results.keys()):
                    detailed_listings.append(results[idx])

                    # Save progress periodically
                    if len(detailed_listings) % 5 == 0:
                        progress_file = output_dir / "detailed_listings_progress.json"
                        with open(progress_file, 'w', encoding='utf-8') as f:
                            json.dump(detailed_listings, f, indent=2, ensure_ascii=False)

        else:
            # Sequential mode (original behavior)
            driver = create_chrome_driver()

            try:
                for idx, listing in enumerate(listings):
                    listing_id = f"listing_{idx + 1:03d}"
                    listing_url = listing.get("link", "")

                    if not listing_url:
                        print(f"Skipping listing {listing_id} - no URL")
                        continue

                    # Get or generate UUID
                    listing_uuid = listing.get("uuid", str(uuid.uuid4()))

                    # Scrape details
                    detailed_data = scrape_listing_details(driver, listing_url, listing_id, listing_uuid, html_dir)

                    # Merge with original listing data
                    detailed_data["original_thumbnail"] = listing.get("image_url")
                    detailed_data["original_preview_data"] = {
                        "price": listing.get("price"),
                        "title": listing.get("title"),
                        "location": listing.get("location")
                    }

                    # Fallback: Use original thumbnail if no images were extracted
                    if not detailed_data.get("image_urls") or len(detailed_data["image_urls"]) == 0:
                        original_thumb = listing.get("image_url")
                        if original_thumb:
                            detailed_data["image_urls"] = [original_thumb]
                            detailed_data["image_count"] = 1
                            print(f"Used original thumbnail as fallback for {listing_id}")

                    # Fallback: Use original price if not extracted
                    if detailed_data.get("price") == "N/A" and listing.get("price"):
                        detailed_data["price"] = listing.get("price")

                    detailed_listings.append(detailed_data)

                    # Save progress after each listing
                    progress_file = output_dir / "detailed_listings_progress.json"
                    with open(progress_file, 'w', encoding='utf-8') as f:
                        json.dump(detailed_listings, f, indent=2, ensure_ascii=False)

                    # Rate limiting to avoid being blocked
                    time.sleep(2)

                    print(f"Progress: {idx + 1}/{len(listings)} listings completed")
            finally:
                driver.quit()

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
        if detailed_listings:
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


if __name__ == "__main__":
    main()
