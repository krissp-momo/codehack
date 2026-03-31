import asyncio
import os
import json
from typing import AsyncGenerator

from services.cost_tracker import add_to_outbox, mark_outbox_done, mark_outbox_failed, get_pending_outbox

# ── Primary & Fallback API labels ───────────────────────────────────────────
PRIMARY_SHEET_SERVICE   = "google_sheets"
FALLBACK_SHEET_SERVICE  = "airtable"
PRIMARY_COMMS_SERVICE   = "slack"
FALLBACK_COMMS_SERVICE  = "discord"


class _FakeSheetAPI:
    """Simulated Google Sheets push. Replace body with real gspread / googleapis."""
    async def append_row(self, data: dict) -> bool:
        await asyncio.sleep(0.3)   # simulate latency
        # Return True on success, False to simulate outage:
        return True


class _FakeAirtableAPI:
    async def append_row(self, data: dict) -> bool:
        await asyncio.sleep(0.2)
        return True


_sheet_api    = _FakeSheetAPI()
_airtable_api = _FakeAirtableAPI()


# ── DAG step runner ──────────────────────────────────────────────────────────
async def run_dag(steps: list[dict]) -> AsyncGenerator[dict, None]:
    """
    Execute a list of DAG steps sequentially (parallelism can be added later).
    Yields progress events for the frontend stream.
    Each step: {"id": str, "service": str, "payload": dict}
    """
    for step in steps:
        yield {"step": step["id"], "status": "running", "service": step["service"]}

        success = await _execute_step(step)

        if success:
            yield {"step": step["id"], "status": "done", "service": step["service"]}
        else:
            # Save to outbox buffer
            outbox_id = await add_to_outbox(step["service"], step["payload"])
            yield {
                "step":      step["id"],
                "status":    "buffered",
                "service":   step["service"],
                "outbox_id": outbox_id,
                "note":      "Primary API failed. Saved to outbox buffer for retry.",
            }

            # Try fallback immediately
            fallback = _get_fallback(step["service"])
            if fallback:
                fallback_step = {**step, "service": fallback}
                fallback_ok = await _execute_step(fallback_step)
                if fallback_ok:
                    await mark_outbox_done(outbox_id)
                    yield {
                        "step":    step["id"],
                        "status":  "done_via_fallback",
                        "service": fallback,
                    }
                else:
                    await mark_outbox_failed(outbox_id)
                    yield {"step": step["id"], "status": "failed", "service": fallback}


async def _execute_step(step: dict) -> bool:
    service = step["service"]
    payload = step["payload"]

    if service == PRIMARY_SHEET_SERVICE:
        return await _sheet_api.append_row(payload)
    if service == FALLBACK_SHEET_SERVICE:
        return await _airtable_api.append_row(payload)
    # Add more services (Calendar, Slack, etc.) here
    return False


def _get_fallback(service: str) -> str | None:
    fallbacks = {
        PRIMARY_SHEET_SERVICE:  FALLBACK_SHEET_SERVICE,
        PRIMARY_COMMS_SERVICE:  FALLBACK_COMMS_SERVICE,
    }
    return fallbacks.get(service)


# ── Retry pending outbox items ───────────────────────────────────────────────
async def retry_outbox() -> list[dict]:
    results = []
    pending = await get_pending_outbox()
    for item in pending:
        step = {
            "id":      f"retry_{item['id']}",
            "service": item["service"],
            "payload": json.loads(item["payload"]),
        }
        ok = await _execute_step(step)
        if ok:
            await mark_outbox_done(item["id"])
            results.append({"id": item["id"], "status": "retried_ok"})
        else:
            await mark_outbox_failed(item["id"])
            results.append({"id": item["id"], "status": "still_failed"})
    return results
