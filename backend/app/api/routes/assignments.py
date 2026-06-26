from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta

from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, Form, File, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_professor
from app.db.session import get_db
from app.models.academics import Assignment, AssignmentLink, AssignmentSubmission, Class
from app.schemas.academics import AssignmentOut, AssignmentSubmissionOut, AssignmentDetailOut
from app.services.teacher_agent import analyze_submission
from app.services.rubric_scorer import score_with_rubric

router = APIRouter(prefix="/assignments", tags=["Assignments"])


@router.post("/create", response_model=AssignmentOut)
async def create_assignment(
    title: str = Form(...),
    description: str = Form(...),
    class_id: int = Form(...),
    rubric: Optional[str] = Form(None),  # JSON string: [{criterion, expected, max_points}]
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    parsed_rubric = None
    if rubric:
        try:
            parsed_rubric = json.loads(rubric)
            # Validate: must be a list with at least one criterion
            if not isinstance(parsed_rubric, list) or len(parsed_rubric) == 0:
                parsed_rubric = None
        except (json.JSONDecodeError, ValueError):
            parsed_rubric = None

    new_asn = Assignment(
        title=title,
        description=description,
        class_id=class_id,
        created_by_professor_id=current_professor.id,
        rubric=parsed_rubric,
    )
    db.add(new_asn)
    await db.commit()
    await db.refresh(new_asn)
    return new_asn


@router.get("/my", response_model=list[AssignmentOut])
async def get_my_assignments(
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Assignment)
        .options(selectinload(Assignment.class_), selectinload(Assignment.submissions))
        .where(Assignment.created_by_professor_id == current_professor.id)
        .order_by(Assignment.created_at.desc())
    )
    return result.scalars().all()


@router.post("/{assignment_id}/generate-link")
async def generate_assignment_link(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(select(Assignment).where(Assignment.id == assignment_id))
    asn = result.scalar_one_or_none()
    if not asn or asn.created_by_professor_id != current_professor.id:
        raise HTTPException(404, "Assignment not found")

    # Check for existing active link first
    existing_link = await db.execute(
        select(AssignmentLink).where(
            AssignmentLink.assignment_id == assignment_id,
            AssignmentLink.expires_at > datetime.utcnow(),
        )
    )
    link = existing_link.scalars().first()

    if not link:
        token = str(uuid.uuid4())
        expires_at = datetime.utcnow() + timedelta(days=2)
        link = AssignmentLink(
            assignment_id=assignment_id, token=token, expires_at=expires_at
        )
        db.add(link)
        await db.commit()
        await db.refresh(link)

    return {
        "url": f"http://localhost:5173/student-assignment/{link.token}",
        "expires_at": link.expires_at,
    }


@router.get("/link/{token}", response_model=AssignmentOut)
async def get_assignment_by_token(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(AssignmentLink)
        .options(
            selectinload(AssignmentLink.assignment).selectinload(Assignment.class_)
        )
        .where(AssignmentLink.token == token)
    )
    link = result.scalar_one_or_none()
    if not link or link.expires_at < datetime.utcnow():
        raise HTTPException(400, "Link invalid or expired")

    return link.assignment


import os
from app.services.document_service import DocumentExtractor


@router.post("/submit")
async def submit_assignment(
    token: str = Form(...),
    student_name: str = Form(...),
    roll_no: str = Form(...),
    content: Optional[str] = Form(None),
    file: Optional[UploadFile] = File(None),
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(AssignmentLink)
        .options(selectinload(AssignmentLink.assignment))
        .where(AssignmentLink.token == token)
    )
    link = result.scalar_one_or_none()
    if not link or link.expires_at < datetime.utcnow():
        raise HTTPException(400, "Link expired")

    final_content = content or ""
    file_path = None
    original_filename = None

    if file:
        original_filename = file.filename
        content_bytes = await file.read()

        # Extract text for ML analysis
        extracted_text = DocumentExtractor.extract_text(content_bytes, original_filename)
        final_content = (
            extracted_text
            if not final_content
            else f"{final_content}\n\n[FILE CONTENT]:\n{extracted_text}"
        )

        # Save file to disk
        upload_dir = "uploads/assignments"
        os.makedirs(upload_dir, exist_ok=True)
        file_path = f"{upload_dir}/{token}_{roll_no}_{original_filename}"
        with open(file_path, "wb") as f:
            f.write(content_bytes)

    if not final_content.strip():
        raise HTTPException(400, "No content provided (pasted text or file)")

    # ── 1. AI detection (existing) ──────────────────────────────────────────
    analysis = await analyze_submission(final_content)

    # ── 2. ML Rubric scoring (new) ──────────────────────────────────────────
    rubric_result = None
    assignment = link.assignment
    if assignment.rubric:
        rubric_result = await score_with_rubric(final_content, assignment.rubric)

    submission = AssignmentSubmission(
        assignment_id=link.assignment_id,
        student_name=student_name,
        roll_no=roll_no,
        content=final_content,
        file_path=file_path,
        original_filename=original_filename,
        ai_score=analysis.get("ai_score", 0),
        ai_label=analysis.get("label", "Unknown"),
        ai_feedback=analysis.get("feedback", ""),
        rubric_score=rubric_result["total_score"] if rubric_result else None,
        rubric_feedback=rubric_result["breakdown"] if rubric_result else None,
    )
    db.add(submission)
    try:
        await db.commit()
    except Exception:
        await db.rollback()
        raise HTTPException(400, "You have already submitted this assignment.")

    return {
        "message": "Success",
        "analysis": analysis,
        "rubric_result": rubric_result,
    }


@router.get("/{assignment_id}/submissions", response_model=list[AssignmentSubmissionOut])
async def get_submissions(
    assignment_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(AssignmentSubmission)
        .where(AssignmentSubmission.assignment_id == assignment_id)
        .order_by(AssignmentSubmission.submitted_at.desc())
    )
    return result.scalars().all()


from fastapi.responses import FileResponse


@router.get("/{submission_id}/download")
async def download_submission(
    submission_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(AssignmentSubmission).where(AssignmentSubmission.id == submission_id)
    )
    sub = result.scalar_one_or_none()
    if not sub or not sub.file_path or not os.path.exists(sub.file_path):
        raise HTTPException(404, "File not found")

    asn_result = await db.execute(
        select(Assignment).where(Assignment.id == sub.assignment_id)
    )
    asn = asn_result.scalar_one_or_none()
    if not asn or asn.created_by_professor_id != current_professor.id:
        raise HTTPException(403, "Unauthorized")

    return FileResponse(
        sub.file_path,
        filename=sub.original_filename,
        media_type="application/octet-stream",
    )
