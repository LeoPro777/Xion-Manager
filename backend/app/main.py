import os
from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.core.database import engine, Base
from app.core.exceptions import AppException, app_exception_handler
from app.api.v1.api_router import api_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    debug=settings.DEBUG
)

# CORS Middleware setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static Files for Uploads (Payment Methods)
BASE_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
UPLOAD_PAYMENT_METHODS_DIR = os.path.join(BASE_BACKEND_DIR, "data", "uploads", "payment_methods")
os.makedirs(UPLOAD_PAYMENT_METHODS_DIR, exist_ok=True)
app.mount("/static/payment_methods", StaticFiles(directory=UPLOAD_PAYMENT_METHODS_DIR), name="payment_method_images")

# Domain Exception Handler
app.add_exception_handler(AppException, app_exception_handler)

# API Routers
app.include_router(api_router, prefix=settings.API_V1_STR)


# WebSocket Realtime Live Sync Endpoint
@app.websocket("/ws/live-sync")
async def websocket_live_sync(websocket: WebSocket):
    await websocket.accept()
    try:
        while True:
            data = await websocket.receive_text()
            await websocket.send_text(f"Xion-Manager WebSocket Echo: {data}")
    except WebSocketDisconnect:
        pass

from fastapi.responses import FileResponse

# Resolve Frontend Build Directory for unified single-container deployment
BASE_PROJECT_DIR = os.path.dirname(BASE_BACKEND_DIR)
CANDIDATE_FRONTEND_PATHS = [
    settings.FRONTEND_DIST_DIR,
    "/app/frontend_dist",
    os.path.join(BASE_PROJECT_DIR, "frontend-web", "dist"),
    os.path.join(BASE_BACKEND_DIR, "dist")
]
FRONTEND_DIST_DIR = next((p for p in CANDIDATE_FRONTEND_PATHS if p and os.path.isdir(p)), None)

if FRONTEND_DIST_DIR:
    assets_dir = os.path.join(FRONTEND_DIST_DIR, "assets")
    if os.path.isdir(assets_dir):
        app.mount("/assets", StaticFiles(directory=assets_dir), name="frontend_assets")

    @app.get("/{full_path:path}", include_in_schema=False)
    async def serve_spa(full_path: str):
        if full_path.startswith("api/") or full_path.startswith("static/") or full_path in ("docs", "redoc", "openapi.json"):
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Not Found")

        file_path = os.path.join(FRONTEND_DIST_DIR, full_path)
        if full_path and os.path.isfile(file_path):
            return FileResponse(file_path)

        index_html = os.path.join(FRONTEND_DIST_DIR, "index.html")
        if os.path.isfile(index_html):
            return FileResponse(index_html)

        return {"system": settings.PROJECT_NAME, "status": "online", "version": "1.0.0"}
else:
    @app.get("/")
    async def root():
        return {
            "system": settings.PROJECT_NAME,
            "status": "online",
            "version": "1.0.0",
            "docs": "/docs"
        }

@app.on_event("startup")
async def on_startup():
    try:
        from app.core.init_db import seed_initial_data
        await seed_initial_data()
    except Exception:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)

