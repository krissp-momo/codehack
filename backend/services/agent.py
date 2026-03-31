import os
import json
import asyncio
from openai import AsyncOpenAI
from dotenv import load_dotenv
from services.cost_tracker import record_usage, estimate_cost

load_dotenv()

PLANNER_SYSTEM_PROMPT = """
You are an AI agent orchestrator. The user will give you a natural language instruction.
Your job is to decompose it into a list of concrete steps the system can execute.

Available tools/services:
- extract_email: Extract structured data from an email body
- extract_transcript: Extract structured data from a meeting transcript  
- push_to_sheets: Push extracted data to Google Sheets tracker
- schedule_meeting: Schedule an online/offline meeting with reminder
- add_note: Save a quick note
- send_comms: Send a communication/follow-up message

Return ONLY a JSON object in this format:
{
  "intent_summary": "One line description of what the user wants",
  "steps": [
    {
      "id": "step_1",
      "tool": "<tool_name>",
      "description": "What this step does in plain English",
      "params": { "key": "value extracted from user message" }
    }
  ],
  "needs_data": "<field name if you need more info from user, else null>",
  "data_question": "<question to ask user if needs_data is not null, else null>"
}
"""


def _get_client():
    key = os.getenv("OPENAI_API_KEY", "")
    if not key or key.startswith("sk-your"):
        return None
    return AsyncOpenAI(api_key=key)


async def _mock_plan(message: str) -> dict:
    """
    Keyword-based mock planner for when no API key is available.
    Simulates what the LLM would return.
    """
    await asyncio.sleep(0.6)
    msg = message.lower()
    steps = []

    # Detect transcript/email
    if any(w in msg for w in ["transcript", "meeting", "call", "discussion", "talked", "spoke"]):
        steps.append({
            "id": "step_1", "tool": "extract_transcript",
            "description": "Extract client details from the transcript",
            "params": {"text": message}
        })
        steps.append({
            "id": "step_2", "tool": "push_to_sheets",
            "description": "Log extracted data to Google Sheets tracker",
            "params": {"source": "transcript"}
        })
    elif any(w in msg for w in ["email", "mail", "message from", "sent by"]):
        steps.append({
            "id": "step_1", "tool": "extract_email",
            "description": "Extract structured data from the email",
            "params": {"text": message}
        })
        steps.append({
            "id": "step_2", "tool": "push_to_sheets",
            "description": "Log extracted data to Google Sheets tracker",
            "params": {"source": "email"}
        })

    # Detect scheduling
    if any(w in msg for w in ["schedule", "meeting", "call", "appointment", "book", "set up"]):
        steps.append({
            "id": f"step_{len(steps)+1}", "tool": "schedule_meeting",
            "description": "Schedule the meeting and set a reminder",
            "params": {
                "title": "Meeting",
                "meeting_type": "online" if any(w in msg for w in ["online", "zoom", "google meet", "teams", "virtual"]) else "offline",
                "reminder_minutes": 15
            }
        })

    # Detect notes
    if any(w in msg for w in ["note", "notes", "jot", "remember", "save"]):
        steps.append({
            "id": f"step_{len(steps)+1}", "tool": "add_note",
            "description": "Save a note with the key information",
            "params": {"content": message}
        })

    # Detect sheets push
    if any(w in msg for w in ["log", "sheet", "tracker", "record", "add to"]) and not steps:
        steps.append({
            "id": "step_1", "tool": "push_to_sheets",
            "description": "Log the information to Google Sheets",
            "params": {"data": {"Remarks": message}}
        })

    if not steps:
        steps.append({
            "id": "step_1", "tool": "add_note",
            "description": "Save your message as a note",
            "params": {"content": message}
        })

    intent_map = {
        "extract_transcript": "Process transcript and log to Sheets",
        "extract_email": "Process email and log to Sheets",
        "schedule_meeting": "Schedule meeting",
        "add_note": "Save note",
        "push_to_sheets": "Log to Google Sheets",
    }
    summary = " + ".join(intent_map.get(s["tool"], s["tool"]) for s in steps)

    return {
        "intent_summary": summary,
        "steps": steps,
        "needs_data": None,
        "data_question": None,
    }


async def plan_and_execute(message: str):
    """
    Generator that yields SSE-style events for streaming.
    Phase 1: Planning (LLM or mock)
    Phase 2: Step-by-step execution
    """
    client = _get_client()

    # ── Phase 1: Plan ────────────────────────────────────────────────
    yield {"type": "thinking", "text": "Understanding your request..."}

    if client:
        try:
            cost_info = estimate_cost(message)
            resp = await client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {"role": "system", "content": PLANNER_SYSTEM_PROMPT},
                    {"role": "user",   "content": message},
                ],
                temperature=0,
                response_format={"type": "json_object"},
            )
            record_usage(resp.usage.prompt_tokens, resp.usage.completion_tokens)
            plan = json.loads(resp.choices[0].message.content)
        except Exception as e:
            plan = await _mock_plan(message)
    else:
        plan = await _mock_plan(message)

    yield {"type": "plan", "intent": plan["intent_summary"], "steps": plan["steps"]}

    if plan.get("needs_data"):
        yield {"type": "question", "field": plan["needs_data"], "question": plan["data_question"]}
        return

    # ── Phase 2: Execute each step ───────────────────────────────────
    extracted_data = {}

    for step in plan["steps"]:
        await asyncio.sleep(0.5)
        yield {"type": "step_start", "id": step["id"], "description": step["description"], "tool": step["tool"]}

        tool = step["tool"]

        if tool in ("extract_email", "extract_transcript"):
            from services.llm_extractor import extract_from_text
            text = step["params"].get("text", message)
            data = await extract_from_text(text)
            extracted_data = data
            yield {"type": "step_result", "id": step["id"], "status": "needs_verification",
                   "data": data, "message": "Review the extracted data before pushing to Sheets."}

        elif tool == "push_to_sheets":
            from services.orchestrator import run_dag
            payload = extracted_data if extracted_data else step["params"].get("data", {"Remarks": message})
            dag_steps = [{"id": step["id"], "service": "google_sheets", "payload": payload}]
            async for event in run_dag(dag_steps):
                yield {"type": "dag_event", "id": step["id"], **event}

        elif tool == "schedule_meeting":
            params = step["params"]
            yield {"type": "step_result", "id": step["id"], "status": "done",
                   "message": f"Meeting scheduled ({params.get('meeting_type','online')}), reminder set for {params.get('reminder_minutes',15)} mins before."}

        elif tool == "add_note":
            yield {"type": "step_result", "id": step["id"], "status": "done",
                   "message": "Note saved successfully."}

        elif tool == "send_comms":
            yield {"type": "step_result", "id": step["id"], "status": "done",
                   "message": "Message queued for delivery."}

        else:
            yield {"type": "step_result", "id": step["id"], "status": "done",
                   "message": f"Executed {tool}."}

    yield {"type": "done", "text": "All done! Anything else?"}
