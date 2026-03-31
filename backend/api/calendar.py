import asyncio
from fastapi import APIRouter
from pydantic import BaseModel
from datetime import datetime

router = APIRouter(prefix="/api/calendar", tags=["calendar"])


# In a real implementation, replace with Google Calendar API client.
_mock_events: list[dict] = []


class EventRequest(BaseModel):
    title: str
    description: str = ""
    start_time: str          # ISO format: 2025-04-01T10:00:00
    end_time: str
    meeting_type: str = "online"   # "online" or "offline"
    attendees: list[str] = []
    reminder_minutes: int = 15


@router.post("/schedule")
async def schedule_event(req: EventRequest):
    """Schedule an online/offline meeting and set a reminder."""
    event = {
        "id":               len(_mock_events) + 1,
        "title":            req.title,
        "description":      req.description,
        "start_time":       req.start_time,
        "end_time":         req.end_time,
        "meeting_type":     req.meeting_type,
        "attendees":        req.attendees,
        "reminder_minutes": req.reminder_minutes,
        "created_at":       datetime.utcnow().isoformat(),
        "status":           "scheduled",
    }
    _mock_events.append(event)
    return {"success": True, "event": event}


@router.get("/events")
async def list_events():
    """Return all scheduled events."""
    return {"events": _mock_events}


class NoteRequest(BaseModel):
    title: str
    content: str


_notes: list[dict] = []


@router.post("/notes")
async def add_note(req: NoteRequest):
    """Save a note."""
    note = {
        "id":         len(_notes) + 1,
        "title":      req.title,
        "content":    req.content,
        "created_at": datetime.utcnow().isoformat(),
    }
    _notes.append(note)
    return {"success": True, "note": note}


@router.get("/notes")
async def list_notes():
    return {"notes": _notes}
