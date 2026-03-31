from fastapi import APIRouter
from services.cost_tracker import get_dashboard

router = APIRouter(prefix="/api/costs", tags=["costs"])


@router.get("/dashboard")
async def cost_dashboard():
    """Return total token usage and cost for the session."""
    return get_dashboard()
