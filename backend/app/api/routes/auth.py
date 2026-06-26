from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError, IntegrityError

from app.db.session import get_db
from app.models.academics import Professor
from app.schemas.auth import ProfessorCreate, ProfessorLogin, ProfessorOut, Token
from app.core import security


router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=ProfessorOut)
async def register_professor(payload: ProfessorCreate, db: AsyncSession = Depends(get_db)):
    # Verify email uniqueness
    result = await db.execute(select(Professor).where(Professor.email == payload.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")

    try:
        hashed_password = security.get_password_hash(payload.password)
        prof = Professor(
            name=payload.name, 
            email=payload.email, 
            hashed_password=hashed_password
        )
        db.add(prof)
        await db.commit()
        await db.refresh(prof)
        return prof
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered")
    except SQLAlchemyError as e:
        await db.rollback()
        raise HTTPException(status_code=503, detail="Database unavailable. Ensure your local PostgreSQL is running.")


@router.post("/token", response_model=Token)
async def login_for_access_token(payload: ProfessorLogin, db: AsyncSession = Depends(get_db)):
    # 401 invalid email/password per existing flow
    try:
        result = await db.execute(select(Professor).where(Professor.email == payload.email))
        prof = result.scalars().first()
        
        if not prof or not security.verify_password(payload.password, prof.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED, 
                detail="Invalid email or password",
                headers={"WWW-Authenticate": "Bearer"},
            )
        
        # In this simplified local version, sub is the user identifier (email)
        access_token = security.create_access_token(subject=prof.email)
        return {"access_token": access_token, "token_type": "bearer"}
        
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Ensure your local PostgreSQL is running.",
        )

