import asyncio
import json
from fastapi import APIRouter
from fastapi.responses import StreamingResponse
from pydantic import BaseModel
from services.agent import plan_and_execute

router = APIRouter(prefix="/api/agent", tags=["agent"])


class ChatRequest(BaseModel):
    message: str


@router.post("/chat")
async def chat(req: ChatRequest):
    """
    Main agentic endpoint. Takes a natural language message,
    decomposes it into steps, executes them, and streams results.
    """
    async def event_stream():
        async for event in plan_and_execute(req.message):
            yield f"data: {json.dumps(event)}\n\n"

    return StreamingResponse(event_stream(), media_type="text/event-stream")
