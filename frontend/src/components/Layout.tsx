import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function Layout() {
  const { token, logout } = useAuth()

  return (
    <div className="appShell">
      <header className="topbar">
        <div className="brand">Teacher Assistant</div>
        <nav className="nav">
          <NavLink to="/dashboard">Dashboard</NavLink>
          <NavLink to="/classes">Classes</NavLink>
          <NavLink to="/courses">Courses</NavLink>
          <NavLink to="/quizzes">Quizzes</NavLink>
          <NavLink to="/assignments">Assignments</NavLink>
        </nav>
        <div className="topbarRight">
          {token ? (
            <button className="btn" onClick={logout}>
              Logout
            </button>
          ) : (
            <NavLink className="btn" to="/login">
              Login
            </NavLink>
          )}
        </div>
      </header>
      <main className="main">
        <Outlet />
      </main>
    </div>
  )
}

