from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware

from app.core.config import settings
from app.routers.admin_users_router import router as admin_users_router
from app.routers.athena_router import router as athena_router
from app.routers.ai_router import router as ai_router
from app.routers.bootstrap_router import router as bootstrap_router
from app.routers.dashboards_router import router as dashboards_router
from app.routers.health_router import router as health_router
from app.routers.saved_query_router import router as saved_query_router
from app.routers.scheduled_query_router import router as scheduled_query_router
from app.routers.snapshots_router import router as snapshots_router
from app.routers.targets_router import router as targets_router
from app.seed.manifest_seed import seed_from_manifest_if_empty


async def startup_tasks() -> None:
    await seed_from_manifest_if_empty()


def create_app() -> FastAPI:
    app = FastAPI(title="BI Service API", version="0.1.0")

    app.add_middleware(GZipMiddleware, minimum_size=1000)
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:3001",
            "http://127.0.0.1:3001",
            "http://localhost:8080",
            "http://127.0.0.1:8080",
        ],
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
    app.include_router(health_router, prefix="/api")
    app.include_router(bootstrap_router, prefix="/api/v1")
    app.include_router(dashboards_router, prefix="/api/v1")
    app.include_router(snapshots_router, prefix="/api/v1")
    app.include_router(admin_users_router, prefix="/api/v1")
    app.include_router(athena_router, prefix="/api/v1")
    app.include_router(ai_router, prefix="/api/v1")
    app.include_router(targets_router, prefix="/api/v1")
    app.include_router(saved_query_router, prefix="/api/v1")
    app.include_router(scheduled_query_router, prefix="/api/v1")
    app.add_event_handler("startup", startup_tasks)
    return app


app = create_app()
