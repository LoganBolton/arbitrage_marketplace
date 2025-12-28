from openai import OpenAI
from dotenv import load_dotenv
import os
load_dotenv(override=True)
api_key = os.getenv("OPENAI_API_KEY")

def main():
    client = OpenAI(api_key=api_key)

    objects = """
    Wii Sports (Wii)
    Wii Play (Wii)"""

    find_price_prompt = """Please find the prices for the used versions of the following objects. Just do your best to find the information. No need to clarify anything. List out all your sources and then add up each object(s) price and then return the total price at the end in <price>...</price> format. {objects}"""

    response = client.responses.create(
        model="gpt-5-nano-2025-08-07",
        tools=[{"type": "web_search"}],
        input=find_price_prompt.format(objects=objects)
    )

    print(response.output_text)


if __name__ == "__main__":
    main()
    