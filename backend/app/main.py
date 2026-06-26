from __future__ import annotations

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api.routes.auth import router as auth_router
from app.api.routes.classes import router as classes_router
from app.api.routes.courses import router as courses_router
from app.api.routes.quizzes import router as quizzes_router
from app.api.routes.assignments import router as assignments_router
from app.api.routes.analytics import router as analytics_router
from app.core.config import settings
from app.db.session import Base, get_engine

# Import all models to ensure they are registered with Base.metadata for create_all
from app.models.academics import (
    Professor, Class, Course, Quiz, QuizLink, QuizAttempt,
    Assignment, AssignmentLink, AssignmentSubmission
)


def create_app() -> FastAPI:
    app = FastAPI(title="Course Plan Agent API")

    # app.add_middleware(
    #     CORSMiddleware,
    #     allow_origins=[o.strip() for o in settings.CORS_ORIGINS.split(",") if o.strip()],
    #     allow_credentials=True,
    #     allow_methods=["*"],
    #     allow_headers=["*"],
    # )

    # from fastapi.middleware.cors import CORSMiddleware

    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],  # or ["http://localhost:5173"]
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )


    @app.get("/")
    async def root():
        return {"message": "Professor API running"}

    @app.on_event("startup")
    async def startup():
        # Allow boot even if DATABASE_URL isn't set yet.
        try:
            engine = get_engine()
        except Exception:
            return
        try:
            async with engine.begin() as conn:
                await conn.run_sync(Base.metadata.create_all)
        except Exception:
            # DB might be unreachable (bad URL/DNS/SSL). Keep API up; DB endpoints will error.
            return

    app.include_router(auth_router)
    app.include_router(classes_router)
    app.include_router(courses_router)
    app.include_router(quizzes_router)
    app.include_router(assignments_router)
    app.include_router(analytics_router)

    return app


app = create_app()

