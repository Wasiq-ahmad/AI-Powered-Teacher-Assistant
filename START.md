# Getting Started with Teacher Assistant

Welcome to the Teacher Assistant platform! This guide will walk you through setting up the project, migrating the database, and running both the frontend and backend applications locally using **Local PostgreSQL** and **pgAdmin4**.

## Project Structure

The project is divided into two main parts:
- **`backend/`**: A FastAPI Python application powered by local PostgreSQL.
- **`frontend/`**: A React application built with Vite and TypeScript.

---

## 1. Prerequisites

Before you begin, ensure you have the following installed on your system:
- **Python 3.10+** (for the backend)
- **Node.js 18+** (for the frontend)
- **PostgreSQL & pgAdmin4** (Install the standard Postgres package for Windows which includes pgAdmin4).
- An **OpenAI** API Key (required for AI generation features).

---

## 2. Database Setup & Migration (pgAdmin 4)

This project uses a standard Postgres database. Ensure your local Postgres server is running before attempting to create the schema.

### Step 2.1: Create the Database via pgAdmin4
1. Open **pgAdmin4** and connect to your local PostgreSQL server (usually `localhost:5432`, default user is `postgres`).
2. Right-click on **Databases** -> **Create** -> **Database...**
3. Name the new database `teacher_assistant` (or a name of your choice) and click **Save**.

### Step 2.2: Execute the Schema Script
1. In pgAdmin4, right-click on your newly created `teacher_assistant` database and select **Query Tool**.
2. Open the `backend/supabase_schema.sql` file (note: this file can be renamed to `schema.sql` later, but it holds the correct standard Postgres SQL commands) from this source code repository.
3. Copy the entire contents of the SQL file and paste it into the Query Tool window in pgAdmin4.
4. Click the **Execute/Refresh** button (Play icon) or press `F5` to run the script. This will create all necessary tables (`professors`, `classes`, `courses`, `quizzes`, `assignments`, etc.).

---

## 3. Backend Setup

The backend handles API requests, database interactions, and AI integrations.

### Step 3.1: Environment Variables
1. Open your terminal and navigate to the `backend` directory:
   ```bash
   cd backend
   ```
2. Copy the example environment file:
   ```bash
   cp .env.example .env
   ```
   *(On Windows Command Prompt, use `copy .env.example .env`)*
3. Open the `.env` file. You can **remove** any lines starting with `SUPABASE_URL` and `SUPABASE_KEY` as they are no longer needed.
4. Fill in the required values:
   - `DATABASE_URL`: Your local Postgres connection string. Assuming you used the default settings and named the DB `teacher_assistant`, it will look like this:
     ```
     DATABASE_URL="postgresql+asyncpg://postgres:YOUR_DB_PASSWORD@localhost:5432/teacher_assistant"
     ```
     *(Replace `YOUR_DB_PASSWORD` with the password you set during Postgres installation).*
   - `OPENAI_API_KEY`: Your OpenAI API key for generating course plans and quizzes.
   - `SECRET_KEY`: Add a secret key for JWT authentication (e.g., `SECRET_KEY="your-super-secret-key-change-in-production"`).

### Step 3.2: Install Dependencies
1. Create a virtual environment:
   ```bash
   python -m venv .venv
   ```
2. Activate the virtual environment:
   - **Windows PowerShell**: `.venv\Scripts\Activate.ps1`
   - **Windows Command Prompt**: `.venv\Scripts\activate.bat`
   - **macOS/Linux**: `source .venv/bin/activate`
3. Install the required Python packages:
   ```bash
   pip install -r requirements.txt
   ```

### Step 3.3: Run the Backend
Start the FastAPI development server:
```bash
uvicorn app.main:app --reload --port 8000
```
The API will now be accessible at `http://127.0.0.1:8000`. You can visit `http://127.0.0.1:8000/docs` for the interactive API documentation.

---

## 4. Frontend Setup

The frontend is a modern web application for both professors and students.

### Step 4.1: Environment Variables
1. Open a new terminal window and navigate to the `frontend` directory:
   ```bash
   cd frontend
   ```
2. If your backend is running on a port other than `8000`, copy the environment file:
   ```bash
   cp .env.example .env
   ```
3. Update `VITE_API_BASE_URL` in the `.env` file to point to your backend url. By default, it will use `http://127.0.0.1:8000`.

### Step 4.2: Install Dependencies
Install the required Node packages:
```bash
npm install
```

### Step 4.3: Run the Frontend
Start the Vite development server:
```bash
npm run dev
```
The frontend application will now be running, accessible at `http://localhost:5173`.

---

## 5. Next Steps

- **Create a Professor Account**: Visit `http://localhost:5173/register` to create your first administrative account.
- **Login**: Visit `http://localhost:5173/login` using your newly created credentials.
- **Manage Classes**: Navigate to the "Classes" dashboard to start adding your current classes.
- **Generate Courses**: Use the "Courses" tab to let the AI automatically generate a 16-week syllabus and corresponding quizzes.

## 6. Useful Database Queries (pgAdmin 4)

If you need to manually explore or modify data using the pgAdmin 4 Query Tool, here are some useful SQL commands.

### Insert a New Professor (Application User)

*Note: Since passwords must be securely hashed, it is highly recommended to use the frontend `/register` page to create users. However, for testing purposes, you can insert a user manually using this query:*

```sql
INSERT INTO public.professors (name, email, hashed_password) 
VALUES ('Test Professor', 'test@example.com', '$2b$12$D2iP5.qO1wO1k7.eH0/M2.O9/y6qG/bQ1r39b1/72M65B0y40z2vG');
```
*(The above `hashed_password` corresponds to the plain text password: `password123`)*

### Create a Database Superuser (PostgreSQL Role)

If you need to create a new postgres superuser role (for database administration, rather than logging into the application), you can run the following query:

```sql
CREATE ROLE my_superuser WITH LOGIN SUPERUSER PASSWORD 'my_secure_password';
```
*(Replace `my_superuser` and `my_secure_password` with your desired username and password)*


## Troubleshooting

- **Backend fails to start**: Ensure your virtual environment is activated and you have correctly installed all dependencies from `requirements.txt`. Ensure you added a `SECRET_KEY` to the `.env` file.
- **Database Connection Errors**: Double-check your `DATABASE_URL` in `backend/.env`. Ensure the spelling of the database name is correct, the password is correct, and that your local Postgres instance is actively running.
- **AI Features not working**: Verify your `OPENAI_API_KEY` is correct and active in the `backend/.env` file.
