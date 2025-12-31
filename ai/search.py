from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from datetime import datetime

load_dotenv(override=True)
api_key = os.getenv("OPENAI_API_KEY")


def get_latest_run(scraped_data_dir):
    """Find the most recent timestamped run folder"""
    runs = [d for d in os.listdir(scraped_data_dir)
            if os.path.isdir(os.path.join(scraped_data_dir, d)) and d[0].isdigit()]
    if not runs:
        return None
    return max(runs)


def main():
    client = OpenAI(api_key=api_key)

    # Paths
    script_dir = os.path.dirname(__file__)
    scraped_data_dir = os.path.join(script_dir, "..", "selenium", "scraped_data")

    # Find latest run
    latest_run = get_latest_run(scraped_data_dir)
    if not latest_run:
        print("Error: No run folders found")
        return

    run_dir = os.path.join(scraped_data_dir, latest_run)
    listings_path = os.path.join(run_dir, "detailed_listings.json")

    if not os.path.exists(listings_path):
        print(f"Error: {listings_path} not found")
        return

    print(f"Using run: {latest_run}")

    output_dir = os.path.join(script_dir, "responses")
    os.makedirs(output_dir, exist_ok=True)
    responses_path = os.path.join(output_dir, f"price_estimates_{latest_run}.json")

    with open(listings_path, "r") as f:
        listings = json.load(f)

    # Load existing responses
    if os.path.exists(responses_path):
        with open(responses_path, "r") as f:
            responses = json.load(f)
    else:
        responses = {}

    print(f"Loaded {len(listings)} listings")
    print("=" * 60)

    for listing in listings:
        listing_uuid = listing.get("uuid")
        title = listing.get("title", "N/A")
        condition = listing.get("condition", "N/A")
        location = listing.get("location", "N/A")
        description = listing.get("description", "N/A")
        listed_price = listing.get("original_preview_data", {}).get("price", "N/A")
        image_urls = listing.get("image_urls", [])

        print(f"UUID: {listing_uuid}")
        print(f"Title: {title}")
        print(f"Listed price: {listed_price}")
        print(f"Images: {len(image_urls)}")
        print("-" * 40)

        find_price_prompt = f"""Please find the fair market price for this used item being sold on Facebook Marketplace.

        Title: {title}
        Condition: {condition}
        Location: {location}
        Description: {description}

        List a condensed form of your sources and then output a fair market value estimate in <price>$XXX - $XXX</price> format."""

        # Build message content with images if available
        message_content = [{"type": "input_text", "text": find_price_prompt}]
        MAX_IMAGES = 4   # Limit to 4 images
        for url in image_urls[:MAX_IMAGES]:
            message_content.append({
                "type": "input_image",
                "image_url": url
            })

        response = client.responses.create(
            model="gpt-5-nano-2025-08-07",
            tools=[{"type": "web_search"}],
            reasoning={"effort": "low"},
            input=[{
                "type": "message",
                "role": "user",
                "content": message_content
            }]
        )

        output_text = response.output_text
        print(output_text)
        print("=" * 60)

        # Save response keyed by UUID
        responses[listing_uuid] = {
            "uuid": listing_uuid,
            "title": title,
            "listed_price": listed_price,
            "ai_response": output_text,
            "generated_at": datetime.now().isoformat()
        }

        with open(responses_path, "w") as f:
            json.dump(responses, f, indent=2, ensure_ascii=False)
        print(f"Saved to {responses_path}")


if __name__ == "__main__":
    main()
