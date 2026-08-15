from fastapi import APIRouter

from app.api.v1 import assessment, health, results, sessions

api_router = APIRouter()
api_router.include_router(health.router)
api_router.include_router(sessions.router)
api_router.include_router(assessment.router)
api_router.include_router(results.router)
