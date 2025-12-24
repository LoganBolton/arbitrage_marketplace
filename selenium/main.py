import json
import time
from selenium import webdriver
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By


def scrape_marketplace_listings(driver, max_scrolls=3):
    listings = []

    for scroll in range(max_scrolls):
        driver.execute_script("window.scrollTo(0, document.body.scrollHeight);")
        time.sleep(2)

    listing_elements = driver.find_elements(By.CSS_SELECTOR, 'a[href*="/marketplace/item/"]')

    print(f"Found {len(listing_elements)} listing links")

    seen_urls = set()

    for element in listing_elements:
        try:
            link = element.get_attribute('href')

            if link in seen_urls:
                continue
            seen_urls.add(link)

            price_elem = element.find_elements(By.XPATH, './/span[contains(@class, "x193iq5w") and contains(@class, "x1lliihq")]')
            price = price_elem[0].text if price_elem else "N/A"

            title_elems = element.find_elements(By.XPATH, './/span[contains(@class, "x193iq5w") and contains(@class, "x1lliihq")]')
            title = "N/A"
            location = "N/A"

            for elem in title_elems:
                text = elem.text
                if text and text != price:
                    # Check if this looks like a location (ends with state abbreviation)
                    if text.endswith(("AL", "GA", "FL", "TX", "NY", "CA", "NC", "SC", "TN", "VA", "MS", "LA", "AR", "OK", "KS", "MO", "IA", "NE", "SD", "ND", "MT", "WY", "CO", "NM", "AZ", "UT", "NV", "ID", "WA", "OR", "AK", "HI", "ME", "NH", "VT", "MA", "RI", "CT", "NJ", "DE", "MD", "WV", "KY", "OH", "IN", "IL", "WI", "MI", "MN", "PA")):
                        location = text
                    # Otherwise it's the title
                    elif title == "N/A":
                        title = text

            image_elems = element.find_elements(By.TAG_NAME, 'img')
            image_url = image_elems[0].get_attribute('src') if image_elems else "N/A"

            listing_data = {
                "price": price,
                "title": title,
                "location": location,
                "image_url": image_url,
                "link": link
            }

            listings.append(listing_data)
            print(f"Scraped: {title} - {price} - {location}")

        except Exception as e:
            print(f"Error scraping listing: {e}")
            continue

    return listings


def main():
    chrome_options = Options()
    chrome_options.add_argument("--headless")
    chrome_options.add_argument("--no-sandbox")
    chrome_options.add_argument("--disable-dev-shm-usage")
    chrome_options.add_argument("--window-size=1920,1080")
    chrome_options.add_argument("--user-agent=Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")

    driver = webdriver.Chrome(options=chrome_options)

    try:
        url = "https://www.facebook.com/marketplace/108417995849344/?radius_in_km=3"
        print(f"Fetching {url}...")
        driver.get(url)

        print("Waiting for page to load...")
        time.sleep(5)

        listings = scrape_marketplace_listings(driver, max_scrolls=3)

        output_file = "scraped_data/marketplace_listings.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(listings, f, indent=2, ensure_ascii=False)

        print(f"\nScraped {len(listings)} unique listings")
        print(f"Saved to {output_file}")

    finally:
        driver.quit()


if __name__ == "__main__":
    main()
