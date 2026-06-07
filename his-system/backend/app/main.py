from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from .websocket import manager

app = FastAPI(
    title="Hospital Information System API",
    description="Real-time HIS — interlinked departments",
    version="0.1.0"
)

@app.on_event("startup")
def on_startup():
    from .models import user, patient  # noqa: F401 — ensures tables are registered
    from .database import create_tables
    create_tables()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ── Routers ───────────────────────────────────────────────────
from .routers import auth, patients
app.include_router(auth.router,     prefix="/api/auth",     tags=["Auth"])
app.include_router(patients.router, prefix="/api/patients", tags=["Patients"])

# ── WebSocket endpoint ────────────────────────────────────────
@app.websocket("/ws/{user_id}")
async def websocket_endpoint(websocket: WebSocket, user_id: str, role: str = "guest"):
    await manager.connect(websocket, user_id, role)
    try:
        while True:
            await websocket.receive_text()  # keep connection alive
    except WebSocketDisconnect:
        manager.disconnect(user_id, role)

# ── Health check ──────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok", "system": "Hospital Information System"}
