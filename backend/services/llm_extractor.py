import os
import json
from openai import AsyncOpenAI
from dotenv import load_dotenv
from services.cost_tracker import record_usage

load_dotenv()

# ── Google Sheet columns to extract into (update to match your real headers) ──
SHEET_HEADERS = [
    "Client Name",
    "Mobile Number",
    "Email",
    "Date",
    "Meeting Type",
    "Remarks",
    "Action Items",
    "Follow-up Date",
    "Status",
]

EXTRACTION_SYSTEM_PROMPT = f"""
You are a data extraction assistant. Given a raw text (email body or meeting transcript),
extract the following fields and return them as a JSON object.
If a field is not found, set its value to null.
Return ONLY valid JSON. No markdown, no explanation.

Fields to extract:
{json.dumps(SHEET_HEADERS, indent=2)}
"""

MOCK_RESULT = {h: f"[mock] extracted {h}" for h in SHEET_HEADERS}


def _get_client() -> AsyncOpenAI | None:
    key = os.getenv("OPENAI_API_KEY", "")
    if not key or key.startswith("sk-your"):
        return None
    return AsyncOpenAI(api_key=key)


async def extract_from_text(raw_text: str) -> dict:
    """
    Use LLM to map raw email/transcript text to Google Sheet fields.
    Falls back to mock data if no API key is configured.
    """
    client = _get_client()

    if client is None:
        # No API key yet — return clearly labelled mock data
        import asyncio
        await asyncio.sleep(0.5)   # simulate latency
        return {h: f"[demo] {h} value from text" for h in SHEET_HEADERS}

    response = await client.chat.completions.create(
        model="gpt-4o-mini",
        messages=[
            {"role": "system", "content": EXTRACTION_SYSTEM_PROMPT},
            {"role": "user",   "content": raw_text},
        ],
        temperature=0,
        response_format={"type": "json_object"},
    )

    usage = response.usage
    record_usage(usage.prompt_tokens, usage.completion_tokens)

    content = response.choices[0].message.content
    try:
        return json.loads(content)
    except json.JSONDecodeError:
        return {h: None for h in SHEET_HEADERS}
