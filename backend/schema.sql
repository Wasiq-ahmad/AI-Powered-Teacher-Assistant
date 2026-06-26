-- Create tables used by the backend.
-- Run in Supabase SQL editor (public schema).

create table if not exists public.professors (
  id bigserial primary key,
  supabase_user_id uuid unique,
  name text not null,
  email text not null unique
);

create table if not exists public.classes (
  id bigserial primary key,
  class_name text not null,
  professor_id bigint references public.professors(id) on delete cascade
);

create table if not exists public.courses (
  id bigserial primary key,
  name text not null,
  outline text not null,
  credit_hours text not null,
  pdf_path text,
  pdf_data bytea,
  created_by_professor_id bigint references public.professors(id) on delete cascade,
  class_id bigint references public.classes(id) on delete set null
);

create table if not exists public.quizzes (
  id bigserial primary key,
  course_id bigint references public.courses(id) on delete cascade,
  quiz_number int not null,
  weeks_range text not null,
  questions text not null
);

create table if not exists public.quiz_links (
  id bigserial primary key,
  quiz_id bigint references public.quizzes(id) on delete cascade,
  token text not null unique,
  expires_at timestamptz not null,
  is_active boolean not null default true
);

create table if not exists public.quiz_attempts (
  id bigserial primary key,
  quiz_id bigint references public.quizzes(id) on delete cascade,
  student_name text not null,
  roll_no text not null,
  class_name text not null,
  score int not null,
  total int not null,
  submitted_at timestamptz not null default now(),
  constraint uq_quiz_rollno unique (quiz_id, roll_no)
);

