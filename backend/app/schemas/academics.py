from __future__ import annotations

from datetime import datetime
from typing import Optional,List

from pydantic import BaseModel



class ClassCreate(BaseModel):
    class_name: str
    section_name: Optional[str] = None


class SectionOut(BaseModel):
    id: int
    name: str

    class Config:
        from_attributes = True


class ClassOut(BaseModel):
    id: int
    class_name: str
    professor_name: str
    sections: list[SectionOut] = []

    class Config:
        from_attributes = True


class CourseCreate(BaseModel):
    class_id: int
    name: str
    course_code: str
    section_id: Optional[int] = None
    outline: Optional[str] = None
    credit_hours: Optional[str] = None


class CourseOut(BaseModel):
    id: int
    name: str
    course_code: str
    class_id: int   # ✅ ADD THIS
    outline: str
    credit_hours: str
    pdf_url: Optional[str] = None
    class_name: Optional[str] = None
    section_name: Optional[str] = None
    section_id: Optional[int] = None   # ✅ ADD THIS


    class Config:
        from_attributes = True


class QuizOut(BaseModel):
    id: int
    quiz_number: int
    weeks_range: str
    questions: str
    course_name: Optional[str] = None
    class_name: Optional[str] = None

    class Config:
        from_attributes = True


class QuizLinkOut(BaseModel):
    url: str
    expires_at: datetime


class StudentQuizSubmit(BaseModel):
    token: str
    student_name: str
    roll_no: str
    answers: list[str]


class QuizResultOut(BaseModel):
    student_name: str
    roll_no: str
    class_name: str
    score: int
    total: int
    # answers: list[str] | None = None   # ✅ ADD
    answers: Optional[List[str]] = None   # <-- ADD THIS



    class Config:
        from_attributes = True


class AssignmentSubmissionOut(BaseModel):
    id: int
    student_name: str
    roll_no: str
    content: str
    ai_score: Optional[int] = None
    ai_label: Optional[str] = None
    ai_feedback: Optional[str] = None
    rubric_score: Optional[float] = None    # ML score out of 5
    rubric_feedback: Optional[list] = None  # Per-criterion breakdown
    submitted_at: datetime
    original_filename: Optional[str] = None

    class Config:
        from_attributes = True


class AssignmentOut(BaseModel):
    id: int
    title: str
    description: str
    class_id: int
    class_name: Optional[str] = None
    rubric: Optional[list] = None  # Rubric criteria for ML scoring
    created_at: datetime

    class Config:
        from_attributes = True


class AssignmentDetailOut(AssignmentOut):
    submissions: list[AssignmentSubmissionOut]

