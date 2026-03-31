import asyncio
import json
import os
from typing import Optional
from dotenv import load_dotenv

import aiosqlite
import tiktoken

load_dotenv()

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "outbox.db")

# Approximate cost per 1K tokens (GPT-4o mini as default)
COST_PER_1K_INPUT  = 0.00015
COST_PER_1K_OUTPUT = 0.00060

_total_input_tokens  = 0
_total_output_tokens = 0
_total_cost          = 0.0


async def init_outbox_db():
    """Create outbox table if it doesn't exist."""
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS outbox (
                id        INTEGER PRIMARY KEY AUTOINCREMENT,
                service   TEXT NOT NULL,
                payload   TEXT NOT NULL,
                status    TEXT NOT NULL DEFAULT 'pending',
                retries   INTEGER NOT NULL DEFAULT 0,
                created   TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        await db.commit()


async def add_to_outbox(service: str, payload: dict) -> int:
    """Buffer a failed operation for later retry."""
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO outbox (service, payload) VALUES (?, ?)",
            (service, json.dumps(payload))
        )
        await db.commit()
        return cursor.lastrowid


async def get_pending_outbox() -> list[dict]:
    """Fetch all pending items from the outbox buffer."""
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        cursor = await db.execute(
            "SELECT * FROM outbox WHERE status = 'pending' ORDER BY created ASC"
        )
        rows = await cursor.fetchall()
        return [dict(r) for r in rows]


async def mark_outbox_done(item_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("UPDATE outbox SET status = 'done' WHERE id = ?", (item_id,))
        await db.commit()


async def mark_outbox_failed(item_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE outbox SET status = 'failed', retries = retries + 1 WHERE id = ?",
            (item_id,)
        )
        await db.commit()


def estimate_tokens(text: str, model: str = "gpt-4o-mini") -> int:
    try:
        enc = tiktoken.encoding_for_model(model)
    except KeyError:
        enc = tiktoken.get_encoding("cl100k_base")
    return len(enc.encode(text))


def estimate_cost(prompt: str) -> dict:
    """Pre-execution cost estimate before hitting the LLM."""
    input_tokens = estimate_tokens(prompt)
    # Rough output estimate = 2x input
    output_tokens = input_tokens * 2
    cost = (input_tokens / 1000) * COST_PER_1K_INPUT + (output_tokens / 1000) * COST_PER_1K_OUTPUT
    return {
        "estimated_input_tokens": input_tokens,
        "estimated_output_tokens": output_tokens,
        "estimated_cost_usd": round(cost, 6),
    }


def record_usage(input_tokens: int, output_tokens: int):
    global _total_input_tokens, _total_output_tokens, _total_cost
    _total_input_tokens  += input_tokens
    _total_output_tokens += output_tokens
    _total_cost += (input_tokens / 1000) * COST_PER_1K_INPUT + \
                   (output_tokens / 1000) * COST_PER_1K_OUTPUT


def get_dashboard() -> dict:
    return {
        "total_input_tokens":  _total_input_tokens,
        "total_output_tokens": _total_output_tokens,
        "total_cost_usd":      round(_total_cost, 6),
    }
