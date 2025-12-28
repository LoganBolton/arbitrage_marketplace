import json
import re
import os

script_dir = os.path.dirname(__file__)
responses_path = os.path.join(script_dir, "responses", "price_estimates.json")

with open(responses_path, "r") as f:
    responses = json.load(f)

for uuid, data in responses.items():
    ai_response = data.get("ai_response", "")

    # Extract price from <price>...</price> tags
    match = re.search(r"<price>(.*?)</price>", ai_response)
    if match:
        data["estimated_price"] = match.group(1)
        print(f"{uuid[:8]}... -> {data['estimated_price']}")
    else:
        print(f"{uuid[:8]}... -> No price found")

with open(responses_path, "w") as f:
    json.dump(responses, f, indent=2, ensure_ascii=False)

print(f"\nSaved to {responses_path}")
