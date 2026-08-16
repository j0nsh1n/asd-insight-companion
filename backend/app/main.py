import math
from collections.abc import AsyncIterator
from contextlib import asynccontextmanager
from typing import Any

from fastapi import FastAPI, HTTPException, Request, status
from fastapi.encoders import jsonable_encoder
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response

from app.api.v1.router import api_router
from app.core.config import get_settings
from app.db import init_db


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncIterator[None]:
    init_db()
    yield


def create_app() -> FastAPI:
    settings = get_settings()
    app = FastAPI(
        title="ASD Insight Companion",
        version=settings.app_version,
        description=(
            "Research-only, non-diagnostic ASD-trait prescreen prototype. "
            "Does not diagnose autism."
        ),
        lifespan=lifespan,
        docs_url="/docs" if settings.expose_docs else None,
        redoc_url="/redoc" if settings.expose_docs else None,
        openapi_url="/openapi.json" if settings.expose_docs else None,
    )
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origin_list,
        allow_credentials=True,
        allow_methods=["GET", "POST", "OPTIONS"],
        allow_headers=["*"],
    )
    app.include_router(api_router, prefix="/api/v1")

    @app.middleware("http")
    async def security_headers(_request: Request, call_next: Any) -> Response:
        response = await call_next(_request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["Cache-Control"] = "no-store"
        return response  # type: ignore[no-any-return]

    def _json_safe(value: Any) -> Any:
        if isinstance(value, float) and not math.isfinite(value):
            return str(value)
        if isinstance(value, BaseException):
            return str(value)
        if isinstance(value, dict):
            return {key: _json_safe(item) for key, item in value.items()}
        if isinstance(value, list):
            return [_json_safe(item) for item in value]
        return value

    @app.exception_handler(RequestValidationError)
    async def request_validation_handler(
        _request: Request, exc: RequestValidationError
    ) -> JSONResponse:
        return JSONResponse(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            content={"detail": jsonable_encoder(_json_safe(exc.errors()))},
        )

    @app.exception_handler(Exception)
    async def unhandled_error(_request: Request, exc: Exception) -> JSONResponse:
        if isinstance(exc, HTTPException):
            raise exc
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content={"detail": "internal_error"},
        )

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
