from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.v1.router import api_router
from app.core.config import get_settings


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ASD Insight Companion",
        version=settings.app_version,
        description=(
            "Research-only, non-diagnostic ASD-trait prescreen prototype. "
            "Does not diagnose autism."
        ),
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")

    @app.get("/")
    def root() -> dict[str, str]:
        """API root — the product UI is the Vite app (default :5173)."""
        return {
            "service": settings.app_name,
            "version": settings.app_version,
            "health": "/api/v1/health",
            "ui": "http://localhost:5173",
            "note": "Research-only prototype. Not a medical diagnosis.",
        }

    return app


app = create_app()
