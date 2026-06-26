import { Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/Layout'
import RequireAuth from './components/RequireAuth'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import ClassesPage from './pages/ClassesPage'
import CoursesPage from './pages/CoursesPage'
import QuizzesPage from './pages/QuizzesPage'
import StudentQuizPage from './pages/StudentQuizPage'
import AssignmentsPage from './pages/AssignmentsPage'
import StudentAssignmentPage from './pages/StudentAssignmentPage'
import LandingPage from './pages/LandingPage'

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route element={<Layout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route
          path="/dashboard"
          element={
            <RequireAuth>
              <DashboardPage />
            </RequireAuth>
          }
        />
        <Route
          path="/classes"
          element={
            <RequireAuth>
              <ClassesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/courses"
          element={
            <RequireAuth>
              <CoursesPage />
            </RequireAuth>
          }
        />
        <Route
          path="/quizzes"
          element={
            <RequireAuth>
              <QuizzesPage />
            </RequireAuth>
          }
        />

        <Route
          path="/assignments"
          element={
            <RequireAuth>
              <AssignmentsPage />
            </RequireAuth>
          }
        />

        <Route path="/student-quiz/:token" element={<StudentQuizPage />} />
        <Route path="/student-assignment/:token" element={<StudentAssignmentPage />} />
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Route>
    </Routes>
  )
}

