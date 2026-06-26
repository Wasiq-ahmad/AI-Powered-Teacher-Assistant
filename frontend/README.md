## Frontend (Vite + React)

### Setup

```bash
cd frontend
npm install
```

Create `frontend/.env` from `frontend/.env.example` if your backend is not on `http://127.0.0.1:8000`.

### Run

```bash
cd frontend
npm run dev
```

### Pages

- `/register` create professor account
- `/login` login (stores token locally)
- `/classes` manage classes
- `/courses` (in progress UI wiring)
- `/quizzes` (in progress UI wiring)
- `/student-quiz/:token` student quiz link page

