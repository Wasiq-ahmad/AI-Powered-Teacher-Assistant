from __future__ import annotations

from datetime import datetime

from sqlalchemy import (
    Boolean,
    Column,
    DateTime,
    Float,
    ForeignKey,
    Integer,
    LargeBinary,
    String,
    Text,
    UniqueConstraint,
    JSON,
)
from sqlalchemy.orm import relationship

from app.db.session import Base


class Professor(Base):
    __tablename__ = "professors"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)

    classes = relationship("Class", back_populates="professor", lazy="selectin")
    courses = relationship("Course", back_populates="professor", lazy="selectin")


class Class(Base):
    __tablename__ = "classes"

    id = Column(Integer, primary_key=True)
    class_name = Column(String, nullable=False)
    professor_id = Column(Integer, ForeignKey("professors.id"))

    professor = relationship("Professor", back_populates="classes", lazy="selectin")
    sections = relationship("Section", back_populates="class_", lazy="selectin", cascade="all, delete-orphan")
    courses = relationship("Course", back_populates="class_", lazy="selectin", cascade="all, delete-orphan")
    assignments = relationship("Assignment", back_populates="class_", cascade="all, delete-orphan")

    @property
    def professor_name(self) -> str:
        return self.professor.name if self.professor else ""


class Section(Base):
    __tablename__ = "sections"

    id = Column(Integer, primary_key=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    name = Column(String, nullable=False)

    class_ = relationship("Class", back_populates="sections")
    courses = relationship("Course", back_populates="section", lazy="selectin")


class Course(Base):
    __tablename__ = "courses"

    id = Column(Integer, primary_key=True)
    name = Column(String, nullable=False)
    course_code = Column(String, nullable=False, server_default="")
    outline = Column(Text, nullable=False)
    credit_hours = Column(String, nullable=False)

    pdf_path = Column(String, nullable=True)
    pdf_data = Column(LargeBinary, nullable=True)

    created_by_professor_id = Column(Integer, ForeignKey("professors.id"))
    class_id = Column(Integer, ForeignKey("classes.id"), nullable=True)
    section_id = Column(Integer, ForeignKey("sections.id"), nullable=True)

    professor = relationship("Professor", back_populates="courses", lazy="selectin")
    class_ = relationship("Class", back_populates="courses", lazy="selectin")
    section = relationship("Section", back_populates="courses", lazy="selectin")
    quizzes = relationship("Quiz", back_populates="course", cascade="all, delete-orphan")

    @property
    def professor_name(self) -> str:
        return self.professor.name if self.professor else ""

    @property
    def class_name(self) -> str:
        return self.class_.class_name if self.class_ else ""
    
    @property
    def section_name(self) -> str:
        return self.section.name if self.section else ""


class Quiz(Base):
    __tablename__ = "quizzes"

    id = Column(Integer, primary_key=True, index=True)
    course_id = Column(Integer, ForeignKey("courses.id"))
    quiz_number = Column(Integer, nullable=False)
    weeks_range = Column(String, nullable=False)
    questions = Column(String, nullable=False)

    course = relationship("Course", back_populates="quizzes")
    links = relationship("QuizLink", back_populates="quiz", cascade="all, delete-orphan")
    attempts = relationship("QuizAttempt", back_populates="quiz", cascade="all, delete-orphan")

    @property
    def course_name(self) -> str:
        return self.course.name if self.course else ""

    @property
    def class_name(self) -> str:
        return self.course.class_name if self.course else ""


class QuizLink(Base):
    __tablename__ = "quiz_links"

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)
    is_active = Column(Boolean, default=True)

    quiz = relationship("Quiz", back_populates="links")


class QuizAttempt(Base):
    __tablename__ = "quiz_attempts"

    id = Column(Integer, primary_key=True)
    quiz_id = Column(Integer, ForeignKey("quizzes.id"))

    student_name = Column(String, nullable=False)
    roll_no = Column(String, nullable=False)
    class_name = Column(String, nullable=False)

    score = Column(Integer, nullable=False)
    total = Column(Integer, nullable=False)

    submitted_at = Column(DateTime, default=datetime.utcnow)
    answers = Column(JSON, nullable=True)

    quiz = relationship("Quiz", back_populates="attempts")

    __table_args__ = (
        UniqueConstraint("quiz_id", "roll_no", name="uq_quiz_rollno"),
    )


class Assignment(Base):
    __tablename__ = "assignments"

    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    class_id = Column(Integer, ForeignKey("classes.id"))
    created_by_professor_id = Column(Integer, ForeignKey("professors.id"))
    created_at = Column(DateTime, default=datetime.utcnow)

    # Rubric: list of {criterion, expected, max_points} dicts (total max_points = 5)
    rubric = Column(JSON, nullable=True)

    class_ = relationship("Class", back_populates="assignments")
    submissions = relationship("AssignmentSubmission", back_populates="assignment", cascade="all, delete-orphan")
    links = relationship("AssignmentLink", back_populates="assignment", cascade="all, delete-orphan")

    @property
    def class_name(self) -> str:
        return self.class_.class_name if self.class_ else ""


class AssignmentLink(Base):
    __tablename__ = "assignment_links"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    token = Column(String, unique=True, index=True)
    expires_at = Column(DateTime, nullable=False)

    assignment = relationship("Assignment", back_populates="links")


class AssignmentSubmission(Base):
    __tablename__ = "assignment_submissions"

    id = Column(Integer, primary_key=True)
    assignment_id = Column(Integer, ForeignKey("assignments.id"))
    student_name = Column(String, nullable=False)
    roll_no = Column(String, nullable=False)
    content = Column(Text, nullable=False)
    
    file_path = Column(String, nullable=True)
    original_filename = Column(String, nullable=True)
    
    ai_score = Column(Integer, nullable=True)   # Confidence of AI Generation (0-100)
    ai_label = Column(String, nullable=True)    # "AI", "Human", "Mixed"
    ai_feedback = Column(Text, nullable=True)

    # ML rubric scoring
    rubric_score = Column(Float, nullable=True)   # Total score out of 5
    rubric_feedback = Column(JSON, nullable=True) # Per-criterion breakdown

    submitted_at = Column(DateTime, default=datetime.utcnow)

    assignment = relationship("Assignment", back_populates="submissions")

    __table_args__ = (
        UniqueConstraint("assignment_id", "roll_no", name="uq_asn_rollno"),
    )

