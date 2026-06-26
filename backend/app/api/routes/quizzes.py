from __future__ import annotations

import json
import uuid
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_professor
from app.db.session import get_db
from app.models.academics import Course, Quiz, QuizAttempt, QuizLink
from app.schemas.academics import QuizLinkOut, QuizOut, QuizResultOut, StudentQuizSubmit


router = APIRouter(prefix="/quizzes", tags=["Quizzes"])


@router.get("/{course_id}/quizzes", response_model=list[QuizOut])
async def get_course_quizzes(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Quiz)
        .options(selectinload(Quiz.course).selectinload(Course.class_))
        .where(Quiz.course_id == course_id)
    )
    quizzes = result.scalars().all()

    if not quizzes:
        return []
    return quizzes


@router.get("/quiz/{quiz_id}", response_model=QuizOut)
async def get_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.course)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")
    if quiz.course.created_by_professor_id != current_professor.id:
        raise HTTPException(status_code=403, detail="Unauthorized")
    return quiz


@router.post("/quiz/{quiz_id}/generate-link", response_model=QuizLinkOut)
async def generate_link(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(select(Quiz).options(selectinload(Quiz.course)).where(Quiz.id == quiz_id))
    quiz = result.scalars().first()

    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if quiz.course.created_by_professor_id != current_professor.id:
        raise HTTPException(403, "Unauthorized")

    # Check for existing active link first
    existing_link = await db.execute(
        select(QuizLink)
        .where(QuizLink.quiz_id == quiz_id, QuizLink.expires_at > datetime.utcnow())
    )
    link = existing_link.scalars().first()

    if not link:
        token = str(uuid.uuid4())
        expiry = datetime.utcnow() + timedelta(minutes=20)
        link = QuizLink(quiz_id=quiz_id, token=token, expires_at=expiry)
        db.add(link)
        await db.commit()
        await db.refresh(link)

    return {"url": f"http://localhost:5173/student-quiz/{link.token}", "expires_at": link.expires_at}


@router.get("/student/{token}")
async def get_quiz_by_token(token: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizLink)
        .options(selectinload(QuizLink.quiz).selectinload(Quiz.course))
        .where(QuizLink.token == token)
    )
    link = result.scalars().first()

    if not link or not link.is_active:
        raise HTTPException(404, "Invalid link")
    if link.expires_at < datetime.utcnow():
        raise HTTPException(400, "Link expired")

    quiz = link.quiz
    
    # defensive parsing with cleanup
    try:
        from app.services.teacher_agent import clean_json_response
        sanitized = clean_json_response(quiz.questions)
        questions = json.loads(sanitized)
    except Exception as e:
        print(f"[DATA ERROR] Failed to parse quiz JSON for quiz_id {quiz.id}: {e}")
        raise HTTPException(
            status_code=500, 
            detail="This quiz data is corrupted. Please ask your professor to regenerate this course."
        )

    return {
        "quiz_id": quiz.id,
        "course": quiz.course.name,
        "class_name": quiz.course.class_.class_name if quiz.course.class_ else "",
        "questions": questions[:10],
    }


@router.post("/student/submit")
async def submit_quiz(data: StudentQuizSubmit, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(QuizLink)
        .options(selectinload(QuizLink.quiz).selectinload(Quiz.course).selectinload(Course.class_))
        .where(QuizLink.token == data.token)
    )
    link = result.scalars().first()

    if not link:
        raise HTTPException(404, "Invalid link")
    if link.expires_at < datetime.utcnow():
        raise HTTPException(400, "Link expired")

    quiz = link.quiz
    questions = json.loads(quiz.questions)[:10]

    correct = 0
    for i, q in enumerate(questions):
        if i < len(data.answers) and data.answers[i] == q["correct"]:
            correct += 1

    attempt = QuizAttempt(
        quiz_id=quiz.id,
        student_name=data.student_name,
        roll_no=data.roll_no,
        class_name=quiz.course.class_.class_name if quiz.course.class_ else "",
        score=correct,
        total=len(questions),
        answers=data.answers,   # ✅ ADD THIS

    )
    db.add(attempt)

    try:
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(status_code=400, detail="This roll number has already submitted this quiz.")

    return {"score": f"{correct}/{len(questions)}"}


@router.get("/quiz/{quiz_id}/results", response_model=list[QuizResultOut])
async def get_all_quiz_results(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(select(Quiz).options(selectinload(Quiz.course)).where(Quiz.id == quiz_id))
    quiz = result.scalars().first()
    if not quiz:
        raise HTTPException(404, "Quiz not found")
    if quiz.course.created_by_professor_id != current_professor.id:
        raise HTTPException(403, "Unauthorized")

    result = await db.execute(
        select(QuizAttempt).where(QuizAttempt.quiz_id == quiz_id).order_by(QuizAttempt.id.asc())
    )
    return result.scalars().all()


@router.delete("/quiz/{quiz_id}", status_code=200)
async def delete_quiz(
    quiz_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Quiz).options(selectinload(Quiz.course)).where(Quiz.id == quiz_id)
    )
    quiz = result.scalar_one_or_none()
    if not quiz:
        raise HTTPException(status_code=404, detail="Quiz not found")

    if quiz.course.created_by_professor_id != current_professor.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    await db.delete(quiz)
    await db.commit()
    return {"message": "Quiz and student results deleted successfully."}


@router.delete("/course/{course_id}", status_code=200)
async def delete_all_course_quizzes(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    # Verify course ownership
    result = await db.execute(select(Course).where(Course.id == course_id))
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")
    if course.created_by_professor_id != current_professor.id:
        raise HTTPException(status_code=403, detail="Unauthorized")

    # Fetch all quizzes for this course
    result = await db.execute(select(Quiz).where(Quiz.course_id == course_id))
    quizzes = result.scalars().all()

    for q in quizzes:
        await db.delete(q)
    
    await db.commit()
    return {"message": f"Successfully deleted {len(quizzes)} quizzes and all associated data."}

