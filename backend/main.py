import asyncio
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from services.cost_tracker import init_outbox_db
from api.email    import router as email_router
from api.otter    import router as otter_router
from api.sheets   import router as sheets_router
from api.calendar import router as calendar_router
from api.costs    import router as costs_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_outbox_db()
    yield


app = FastAPI(
    title="MCP Agentic Gateway API",
    description="AI-powered orchestration layer for multi-API workflows",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(email_router)
app.include_router(otter_router)
app.include_router(sheets_router)
app.include_router(calendar_router)
app.include_router(costs_router)


@app.get("/health")
async def health():
    return {"status": "ok", "service": "MCP Agentic Gateway"}
