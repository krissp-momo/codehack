from fastapi import APIRouter
from pydantic import BaseModel
from services.llm_extractor import extract_from_text
from services.cost_tracker import estimate_cost

router = APIRouter(prefix="/api/otter", tags=["otter"])


class OtterRequest(BaseModel):
    transcript: str
    meeting_title: str = ""
    participants: list[str] = []


@router.post("/extract")
async def extract_transcript(req: OtterRequest):
    """
    Accept an Otter.ai meeting transcript, run LLM extraction,
    return structured fields for user verification.
    """
    header = ""
    if req.meeting_title:
        header += f"Meeting: {req.meeting_title}\n"
    if req.participants:
        header += f"Participants: {', '.join(req.participants)}\n"

    combined = header + "\n" + req.transcript
    cost_info = estimate_cost(combined)
    extracted = await extract_from_text(combined)

    return {
        "extracted": extracted,
        "cost_estimate": cost_info,
        "source": "otter_transcript",
    }
