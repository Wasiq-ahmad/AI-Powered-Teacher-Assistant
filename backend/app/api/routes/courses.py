from __future__ import annotations

import asyncio
import os
import random
import re
from io import BytesIO

from fastapi import APIRouter, Depends, HTTPException, File, UploadFile, Form
from fastapi.responses import FileResponse, StreamingResponse
from reportlab.lib import colors
from reportlab.lib.enums import TA_CENTER
from reportlab.lib.pagesizes import A4
from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
from reportlab.platypus import PageBreak, Paragraph, SimpleDocTemplate, Spacer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.auth import get_current_professor
from app.core.config import settings
from app.db.session import get_db
from app.models.academics import Class, Course, Quiz
from app.schemas.academics import CourseCreate, CourseOut
from app.services.teacher_agent import get_agent_response, get_quiz_prompt, get_course_plan_prompt, clean_json_response
from app.utils.pdf_parser import extract_text_from_pdf


router = APIRouter(prefix="/courses", tags=["Courses"])


os.makedirs(settings.PDF_STORAGE_DIR, exist_ok=True)


async def generate_week_content(week, payload, lecture_count, lab_count, semaphore):
    async with semaphore:
        for attempt in range(3):
            try:
                query = get_course_plan_prompt(
                    week=week,
                    outline=payload.outline,
                    credit_hours=payload.credit_hours
                )
                week_content = await get_agent_response(query)
                await asyncio.sleep(2)
                return week_content.strip()
            except Exception:
                wait_time = (2**attempt) + random.uniform(0, 1.5)
                await asyncio.sleep(wait_time)
        raise HTTPException(status_code=500, detail=f"Failed to generate Week {week}")


def build_pdf(course_title, credit_hours, outline, course_plan):
    buffer = BytesIO()
    doc = SimpleDocTemplate(buffer, pagesize=A4, title=course_title)
    styles = getSampleStyleSheet()

    styles.add(
        ParagraphStyle(
            name="CourseTitle",
            fontSize=18,
            leading=22,
            alignment=TA_CENTER,
            spaceAfter=14,
            textColor=colors.HexColor("#1F4E79"),
        )
    )
    styles.add(
        ParagraphStyle(
            name="SectionHeader",
            fontSize=14,
            leading=18,
            textColor=colors.HexColor("#2E75B6"),
            spaceAfter=8,
            spaceBefore=12,
        )
    )
    styles.add(
        ParagraphStyle(
            name="LectureHeading",
            fontSize=12,
            leading=15,
            textColor=colors.HexColor("#0070C0"),
            spaceBefore=6,
            spaceAfter=4,
        )
    )
    styles.add(ParagraphStyle(name="BodyTextSmall", fontSize=10, leading=14, spaceAfter=4))

    story = []
    story.append(Paragraph(course_title, styles["CourseTitle"]))
    story.append(Paragraph(f"<b>Credit Hours:</b> {credit_hours}", styles["BodyTextSmall"]))
    story.append(Spacer(1, 10))

    story.append(Paragraph("Course Outline", styles["SectionHeader"]))
    story.append(Paragraph(outline.replace("\n", "<br/>"), styles["BodyTextSmall"]))
    story.append(PageBreak())

    story.append(Paragraph("16-Week Course Plan", styles["SectionHeader"]))
    story.append(Spacer(1, 10))

    for line in course_plan.split("\n"):
        line = line.strip()
        if not line:
            continue
        if line.startswith("## "):
            story.append(Paragraph(line[3:], styles["LectureHeading"]))
        elif line.startswith("### "):
            story.append(Paragraph(f"<b>{line[4:]}</b>", styles["BodyTextSmall"]))
        elif line.startswith("- "):
            story.append(Paragraph(f"• {line[2:]}", styles["BodyTextSmall"]))
        else:
            story.append(Paragraph(line, styles["BodyTextSmall"]))
        story.append(Spacer(1, 4))

    doc.build(story)
    buffer.seek(0)
    return buffer


@router.post("/generate", response_model=CourseOut)
async def generate_course_for_class(
    name: str = Form(...),
    course_code: str = Form(...),
    class_id: int = Form(...),
    section_id: int | None = Form(None),
    credit_hours: str = Form(...),
    outline_text: str = Form(""),
    outline_file: UploadFile | None = File(None),
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    print(f"\n[START] Generating Course: {name} for Professor: {current_professor.name}")
    try:
        cls = await db.get(Class, class_id)
        if not cls:
            print(f"[ERROR] Class ID {class_id} not found")
            raise HTTPException(status_code=404, detail="Class not found")
        
        # Determine outline
        final_outline = outline_text
        if outline_file:
            print(f"[PDF] Extracting text from uploaded file: {outline_file.filename}")
            file_content = await outline_file.read()
            pdf_text = extract_text_from_pdf(file_content)
            if pdf_text:
                final_outline = pdf_text
                print(f"[PDF] Successfully extracted {len(final_outline)} characters.")
            else:
                print("[PDF] Extraction failed or file empty.")

        if not final_outline:
            print("[ERROR] No outline provided (neither text nor PDF).")
            raise HTTPException(status_code=400, detail="Course outline is required.")

        safe_course_name = re.sub(r"[^A-Za-z0-9]+", "_", name.strip())
        filename = f"{safe_course_name}_CoursePlan.pdf"
        pdf_path = os.path.join(settings.PDF_STORAGE_DIR, filename)

        new_course = Course(
            name=name,
            course_code=course_code,
            outline=final_outline,
            credit_hours=credit_hours,
            created_by_professor_id=current_professor.id,
            class_id=class_id,
            section_id=section_id,
        )
        db.add(new_course)
        await db.commit()
        await db.refresh(new_course)
        print(f"[DB] Course ID {new_course.id} created in database.")

        match = re.match(r"(\d+)-(\d+)", credit_hours or "")
        lecture_count, lab_count = (int(match.group(1)), int(match.group(2))) if match else (3, 0)
        print(f"[LOGIC] Credit Hours: {credit_hours} -> {lecture_count} Theory, {lab_count} Lab")

        semaphore = asyncio.Semaphore(5) # Increased concurrency
        all_weeks: list[str] = []
        
        # To pass to generate_week_content correctly
        from types import SimpleNamespace
        dummy_payload = SimpleNamespace(name=name, outline=final_outline, credit_hours=credit_hours)

        async def generate_and_log_week(w):
            print(f"[GEN] Requesting Week {w}/16...")
            content = await generate_week_content(w, dummy_payload, lecture_count, lab_count, semaphore)
            print(f"[GEN] Week {w} Received.")
            return f"## Week {w}\n{content}"

        tasks = [generate_and_log_week(w) for w in range(1, 17)]
        all_weeks = await asyncio.gather(*tasks)
        
        full_plan = "\n\n".join(all_weeks)
        print("[PDF] Building final course plan PDF...")

        pdf_buffer = build_pdf(
            course_title=name,
            credit_hours=credit_hours,
            outline=final_outline,
            course_plan=full_plan,
        )
        pdf_bytes = pdf_buffer.read()

        with open(pdf_path, "wb") as f:
            f.write(pdf_bytes)

        new_course.pdf_path = pdf_path
        new_course.pdf_data = pdf_bytes
        await db.commit()
        print(f"[PDF] PDF saved to {pdf_path}")

        WEEK_MAP = {
            1: "1-2", 2: "3-4",
            3: "5-6", 4: "7-8",
            5: "9-10", 6: "11-12",
            7: "13-14", 8: "15-16",
        }

        print("[QUIZ] Generating 8 quizzes (1 per 2-week block)...")
        quizzes_to_save: list[Quiz] = []
        
        async def generate_and_log_quiz(q_num):
            async with semaphore:
                weeks_range = WEEK_MAP[q_num]
                start, end = map(int, weeks_range.split("-"))
                content_blocks = [all_weeks[i-1] for i in range(start, end + 1)]
                combined_text = "\n".join(content_blocks).strip()
                
                print(f"[QUIZ] Requesting Quiz {q_num} (Weeks {weeks_range})...")
                quiz_prompt = get_quiz_prompt(weeks_range, combined_text)
                raw_response = await get_agent_response(quiz_prompt)
                quiz_json = clean_json_response(raw_response)
                print(f"[QUIZ] Quiz {q_num} Received and Cleaned.")
                
                return Quiz(
                    course_id=new_course.id,
                    quiz_number=q_num,
                    weeks_range=weeks_range,
                    questions=quiz_json,
                )

        quiz_tasks = [generate_and_log_quiz(qn) for qn in range(1, 9)]
        quizzes_to_save = await asyncio.gather(*quiz_tasks)

        db.add_all(quizzes_to_save)
        await db.commit()
        print("[SUCCESS] Full Generation Complete.\n")

        return CourseOut(
            id=new_course.id,
            name=new_course.name,
            course_code=new_course.course_code,
            class_id=new_course.class_id,        # ✅ ADD
            outline=new_course.outline,
            credit_hours=new_course.credit_hours,
            pdf_url=f"/courses/courses/{new_course.id}/download",
            section_name=new_course.section.name if new_course.section else None,
            section_id=new_course.section_id,   # ✅ ADD THIS

        )
    except HTTPException:
        raise
    except Exception as e:
        import traceback
        err_str = traceback.format_exc()
        with open("error.log", "w") as f:
            f.write(err_str)
        print("[CRITICAL ERROR] Course generation failed:")
        print(err_str)
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/courses/{course_id}/download")
async def download_course_pdf(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    course = await db.get(Course, course_id)
    if not course:
        raise HTTPException(status_code=404, detail="Course not found")

    if course.created_by_professor_id != current_professor.id:
        raise HTTPException(status_code=403, detail="You are not authorized to access this course.")

    if course.pdf_path and os.path.exists(course.pdf_path):
        return FileResponse(
            path=course.pdf_path,
            media_type="application/pdf",
            filename=f"{course.name.replace(' ', '_')}_CoursePlan.pdf",
        )

    if course.pdf_data:
        return StreamingResponse(
            BytesIO(course.pdf_data),
            media_type="application/pdf",
            headers={"Content-Disposition": f"attachment; filename={course.name.replace(' ', '_')}_CoursePlan.pdf"},
        )

    raise HTTPException(status_code=404, detail="PDF not available")


@router.get("/my_courses", response_model=list[CourseOut])
async def get_my_courses(
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    from sqlalchemy.orm import selectinload
    result = await db.execute(
        select(Course)
        .where(Course.created_by_professor_id == current_professor.id)
        .options(selectinload(Course.section))
    )
    courses = result.scalars().all()
    if not courses:
        return []

    course_list: list[CourseOut] = []
    for course in courses:
        pdf_url = (
            f"http://127.0.0.1:8000/courses/courses/{course.id}/download"
            if course.pdf_path or course.pdf_data
            else None
        )
        course_list.append(
            CourseOut(
                id=course.id,
                name=course.name,
                course_code=course.course_code,
                class_id=course.class_id,
                outline=course.outline,
                credit_hours=course.credit_hours,
                pdf_url=pdf_url,
                class_name=course.class_.class_name if course.class_ else None,
                section_name=course.section.name if course.section else None,
            )
        )
    return course_list


@router.delete("/delete_course/{course_id}", status_code=200)
async def delete_course(
    course_id: int,
    db: AsyncSession = Depends(get_db),
    current_professor=Depends(get_current_professor),
):
    result = await db.execute(
        select(Course).where(Course.id == course_id, Course.created_by_professor_id == current_professor.id)
    )
    course = result.scalar_one_or_none()
    if not course:
        raise HTTPException(status_code=404, detail="Course not found or you are not authorized to delete it.")
    await db.delete(course)
    await db.commit()
    return {"message": "Course deleted successfully along with its quizzes."}

