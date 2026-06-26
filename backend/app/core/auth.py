from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.exc import SQLAlchemyError
from jose import jwt, JWTError
from pydantic import ValidationError

from app.core.config import settings
from app.db.session import get_db
from app.models.academics import Professor

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

async def get_current_professor(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db),
) -> Professor:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )

    try:
        payload = jwt.decode(
            token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM]
        )
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except (JWTError, ValidationError):
        raise credentials_exception

    try:
        result = await db.execute(select(Professor).where(Professor.email == email))
        prof = result.scalars().first()
        if prof is None:
            raise credentials_exception
        return prof
    except SQLAlchemyError:
        raise HTTPException(
            status_code=503,
            detail="Database unavailable. Ensure your local PostgreSQL is running.",
        )

