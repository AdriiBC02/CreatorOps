import os
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from config import get_settings
from api.routes import health, videos, clips, shorts, subtitles, thumbnails

settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    os.makedirs(settings.temp_dir, exist_ok=True)
    print(f"Video processor starting on port {settings.port}")
    yield
    # Shutdown
    print("Video processor shutting down")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(health.router, tags=["Health"])
app.include_router(videos.router, prefix="/videos", tags=["Videos"])
app.include_router(clips.router, prefix="/clips", tags=["Clips"])
app.include_router(shorts.router, prefix="/shorts", tags=["Shorts"])
app.include_router(subtitles.router, prefix="/subtitles", tags=["Subtitles"])
app.include_router(thumbnails.router, prefix="/thumbnails", tags=["Thumbnails"])


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host=settings.host, port=settings.port)
