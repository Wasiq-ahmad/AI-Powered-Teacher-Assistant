from __future__ import annotations

from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_professor
from app.db.session import get_db
from app.models.academics import Class, Section
from app.schemas.academics import ClassCreate, ClassOut
from sqlalchemy.orm import selectinload

router = APIRouter(prefix="/academics", tags=["academics"])


@router.post("/class", response_model=ClassOut)
async def create_class(
    data: ClassCreate,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    # 1. Check if class already exists for this professor
    result = await db.execute(
        select(Class)
        .where(
            Class.class_name == data.class_name,
            Class.professor_id == current_professor.id
        )
        .options(selectinload(Class.sections))
    )
    cls = result.scalar_one_or_none()

    # 2. Create class if not exists
    if not cls:
        cls = Class(
            class_name=data.class_name,
            professor_id=current_professor.id
        )
        db.add(cls)
        await db.flush()  # get class ID

    # 3. Reload class safely with relationships (IMPORTANT FIX)
    result = await db.execute(
        select(Class)
        .where(Class.id == cls.id)
        .options(selectinload(Class.sections))
    )
    cls = result.scalar_one()

    # 4. Add section safely (no lazy loading issue now)
    if data.section_name:
        exists = any(s.name == data.section_name for s in cls.sections)

        if not exists:
            new_section = Section(
                name=data.section_name,
                class_id=cls.id
            )
            db.add(new_section)
            await db.flush()

    # 5. Final reload (so frontend always gets updated relations)
    result = await db.execute(
        select(Class)
        .where(Class.id == cls.id)
        .options(selectinload(Class.sections))
    )
    cls = result.scalar_one()

    await db.commit()
    return cls


@router.get("/get_class", response_model=List[ClassOut])
async def get_classes(
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Class)
        .where(Class.professor_id == current_professor.id)
        .options(selectinload(Class.sections))
    )
    classes = result.scalars().all()

    if not classes:
        return JSONResponse(
            content={"message": "No classes found for this professor."},
            status_code=status.HTTP_200_OK,
        )
    return classes


@router.delete("/class_delete/{class_id}", status_code=200)
async def delete_class(
    class_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Class).where(Class.id == class_id, Class.professor_id == current_professor.id)
    )
    cls = result.scalar_one_or_none()
    if not cls:
        raise HTTPException(
            status_code=404,
            detail="Class not found or you are not authorized to delete it.",
        )

    await db.delete(cls)
    await db.commit()
    return {"message": "Class and all associated courses and quizzes deleted successfully."}

