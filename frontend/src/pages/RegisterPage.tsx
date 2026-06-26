import { useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useAuth } from '../state/auth'

export default function RegisterPage() {
  const nav = useNavigate()
  const { register } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  async function onSubmit(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    setLoading(true)
    try {
      await register(name, email, password)
      setSuccess(true)
    } catch (e: any) {
      setErr(e?.message ?? 'Registration failed')
    } finally {
      setLoading(false)
    }
  }

  if (success) {
    return (
      <div className="card stack" style={{ maxWidth: 440, margin: '24px auto', textAlign: 'center' }}>
        <h2 style={{ color: 'var(--success-color, #10b981)' }}>Account Created!</h2>
        <p>Please check your email to verify your account before logging in.</p>
        <button className="btn" onClick={() => nav('/login')}>
          Go to Login
        </button>
      </div>
    )
  }

  return (
    <div className="card stack" style={{ maxWidth: 440, margin: '24px auto' }}>
      <div>
        <h2 style={{ margin: 0 }}>Register</h2>
        <div className="muted">Creates a professor account.</div>
      </div>

      <form className="stack" onSubmit={onSubmit}>
        <div className="stack">
          <label>
            <div className="muted">Name</div>
            <input value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
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
            {loading ? 'Creating…' : 'Create account'}
          </button>
          <Link to="/login" className="muted">
            Back to login
          </Link>
        </div>
      </form>
    </div>
  )
}

