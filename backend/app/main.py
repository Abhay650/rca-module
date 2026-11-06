from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from . import models  # noqa: F401  (register tables)
from .config import settings
from .database import Base, engine
from .routers import ai, investigations

Base.metadata.create_all(bind=engine)

app = FastAPI(title="AIVOA RCA Module", version="1.0.0")
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in settings.cors_origins.split(",")],
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(ai.router)
app.include_router(investigations.router)


@app.get("/api/health")
def health():
    return {"status": "ok", "model": settings.groq_model, "groq_key_set": bool(settings.groq_api_key)}
