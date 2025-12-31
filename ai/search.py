from openai import OpenAI
from dotenv import load_dotenv
import os
import json
from datetime import datetime

load_dotenv(override=True)
api_key = os.getenv("OPENAI_API_KEY")


def main():
    client = OpenAI(api_key=api_key)

    # Paths
    script_dir = os.path.dirname(__file__)
    listings_path = os.path.join(
        script_dir, "..", "selenium", "scraped_data",
        "detailed_listings", "detailed_listings_progress.json"
    )
    output_dir = os.path.join(script_dir, "responses")
    os.makedirs(output_dir, exist_ok=True)
    responses_path = os.path.join(output_dir, "price_estimates.json")

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
        listed_price = listing.get("original_preview_data", {}).get("price", "N/A")

        print(f"UUID: {listing_uuid}")
        print(f"Title: {title}")
        print(f"Listed price: {listed_price}")
        print("-" * 40)

        find_price_prompt = f"""Please find the fair market price for this used item being sold on Facebook Marketplace.

        Title: {title}
        Condition: {condition}
        Location: {location}

        List a condensed form of your sources and then output a fair market value estimate in <price>$XXX - $XXX</price> format."""

        response = client.responses.create(
            model="gpt-5-nano-2025-08-07",
            tools=[{"type": "web_search"}],
            reasoning={"effort": "low"},
            text={"verbosity": "low"},
            input=find_price_prompt
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
