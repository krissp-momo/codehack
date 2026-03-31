from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from services.llm_extractor import extract_from_text
from services.cost_tracker import estimate_cost

router = APIRouter(prefix="/api/email", tags=["email"])


class EmailRequest(BaseModel):
    subject: str = ""
    body: str
    sender: str = ""


@router.post("/extract")
async def extract_email(req: EmailRequest):
    """
    Accept an email body, run LLM extraction, return structured fields
    mapped to Google Sheet headers (for user verification before push).
    """
    combined = f"Subject: {req.subject}\nFrom: {req.sender}\n\n{req.body}"

    # Pre-execution cost estimate
    cost_info = estimate_cost(combined)

    extracted = await extract_from_text(combined)

    return {
        "extracted": extracted,
        "cost_estimate": cost_info,
        "source": "email",
    }
