from __future__ import annotations

from fastapi import APIRouter, Depends
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.core.auth import get_current_professor
from app.db.session import get_db
from app.models.academics import Class, Course, Quiz, QuizAttempt, Assignment, AssignmentSubmission

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get("/dashboard")
async def get_dashboard_stats(
    db: AsyncSession = Depends(get_db),
    current_professor = Depends(get_current_professor)
):
    # 1. Class Performance (Average Quiz Scores)
    classes_result = await db.execute(
        select(Class)
        .options(selectinload(Class.courses).selectinload(Course.quizzes).selectinload(Quiz.attempts))
        .where(Class.professor_id == current_professor.id)
    )
    classes = classes_result.scalars().all()
    
    class_performance = []
    for cls in classes:
        all_attempts = []
        for course in cls.courses:
            for quiz in course.quizzes:
                all_attempts.extend(quiz.attempts)
        
        avg = 0
        if all_attempts:
            avg = sum(a.score for a in all_attempts) / sum(a.total for a in all_attempts) * 100
            
        class_performance.append({
            "name": cls.class_name,
            "avg_score": round(avg, 1),
            "total_submissions": len(all_attempts)
        })

    # 2. Activity Trends (Quiz Submissions over time - simplified to last 7 days)
    # (Since we are using SQLite/async, we aggregate in Python for simplicity)
    recent_attempts = await db.execute(
        select(QuizAttempt)
        .join(Quiz).join(Course)
        .where(Course.created_by_professor_id == current_professor.id)
        .order_by(QuizAttempt.submitted_at.desc())
        .limit(100)
    )
    attempts = recent_attempts.scalars().all()
    
    trending = {}
    for a in attempts:
        day = a.submitted_at.strftime("%Y-%m-%d")
        trending[day] = trending.get(day, 0) + 1
    
    activity_data = [{"date": k, "count": v} for k,v in sorted(trending.items())]

    # 3. AI Detection Status
    asn_subs = await db.execute(
        select(AssignmentSubmission)
        .join(Assignment)
        .where(Assignment.created_by_professor_id == current_professor.id)
    )
    subs = asn_subs.scalars().all()
    
    ai_stats = {
        "AI": 0,
        "Human": 0,
        "Mixed": 0,
        "Unknown": 0
    }
    for s in subs:
        ai_stats[s.ai_label or "Unknown"] += 1
        
    ai_dist = [{"name": k, "value": v} for k,v in ai_stats.items() if v > 0]

    return {
        "class_performance": class_performance,
        "activity_trends": activity_data,
        "ai_distribution": ai_dist,
        "summary": {
            "total_classes": len(classes),
            "total_students_tracked": sum(c["total_submissions"] for c in class_performance),
            "active_assignments": sum(1 for s in subs) # just a proxy
        }
    }
