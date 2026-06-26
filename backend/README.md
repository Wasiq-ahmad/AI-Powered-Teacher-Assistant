
### Setup

- **1) Create `.env`**
  - Copy `backend/.env.example` to `backend/.env`
  - Fill in:
    - `SUPABASE_URL`
    - `SUPABASE_KEY` (server-side key; service role recommended)
    - `DATABASE_URL` (Supabase Postgres connection string)
    - `OPENAI_API_KEY` (required for generating course plans/quizzes)

- **2) Install dependencies**

```bash
cd backend
python -m venv .venv
.venv\\Scripts\\activate
pip install -r requirements.txt
```

- **3) Run**

```bash
cd backend
uvicorn app.main:app --reload --port 8000
```

### API (preserved paths)

- `GET /` -> `{ "message": "Professor API running" }`
- Auth:
  - `POST /auth/register`
  - `POST /auth/token`
- Academics:
  - `POST /academics/class`
  - `GET /academics/get_class`
  - `DELETE /academics/class_delete/{class_id}`
- Courses:
  - `POST /courses/generate`
  - `GET /courses/courses/{course_id}/download`
  - `GET /courses/my_courses`
  - `DELETE /courses/delete_course/{course_id}`
- Quizzes:
  - `GET /quizzes/{course_id}/quizzes`
  - `GET /quizzes/quiz/{quiz_id}`
  - `POST /quizzes/quiz/{quiz_id}/generate-link`
  - `GET /quizzes/student/{token}`
  - `POST /quizzes/student/submit`
  - `GET /quizzes/quiz/{quiz_id}/results`



