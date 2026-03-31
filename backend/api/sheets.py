import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.orchestrator import run_dag, retry_outbox
from services.cost_tracker import get_pending_outbox

router = APIRouter(prefix="/api/sheets", tags=["sheets"])


class PushRequest(BaseModel):
    data: dict          # The verified data from the frontend


@router.post("/push")
async def push_to_sheets(req: PushRequest):
    """
    Accept verified data (after user approval) and push to Google Sheets
    via the DAG orchestrator. If primary API fails, data is buffered.
    Uses SSE streaming so the UI gets real-time step progress.
    """
    dag_steps = [
        {
            "id":      "push_sheet",
            "service": "google_sheets",
            "payload": req.data,
        }
    ]

    async def event_stream():
        async for event in run_dag(dag_steps):
            yield f"data: {json.dumps(event)}\n\n"
        yield "data: {\"done\": true}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")


@router.get("/outbox")
async def get_outbox():
    """View all buffered (pending) outbox items."""
    return await get_pending_outbox()


@router.post("/retry-outbox")
async def retry():
    """Retry all pending outbox items."""
    results = await retry_outbox()
    return {"results": results}
