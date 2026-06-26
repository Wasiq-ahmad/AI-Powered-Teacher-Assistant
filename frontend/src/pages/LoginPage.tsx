import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function LoginPage() {
  const nav = useNavigate()
  const { login } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await login(email, password)
      nav('/dashboard')
    } catch (e: any) {
      setErr(e?.message ?? 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="card stack" style={{ maxWidth: 440, margin: '24px auto' }}>
      <div>
        <h2 style={{ margin: 0 }}>Login</h2>
        <div className="muted">Use your professor account.</div>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        <div className="stack">
          <label>
            <div className="muted">Email</div>
            <input value={email} onChange={(e) => setEmail(e.target.value)} type="email" required />
          </label>
          <label>
            <div className="muted">Password</div>
            <input value={password} onChange={(e) => setPassword(e.target.value)} type="password" required />
          </label>
        </div>

        {err && <div className="error">{err}</div>}

        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? 'Logging in…' : 'Login'}
          </button>
          <Link to="/register" className="muted">
            Create account
          </Link>
        </div>
      </form>
    </div>
  )
}

