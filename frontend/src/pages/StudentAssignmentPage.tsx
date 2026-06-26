import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

// ── Types ────────────────────────────────────────────────────────────────────

type RubricCriterion = {
  criterion: string
  expected: string
  max_points: number
}

type RubricBreakdown = {
  criterion: string
  max_points: number
  score: number
  comment: string
}

type RubricResult = {
  total_score: number
  breakdown: RubricBreakdown[]
}

type AssignmentOut = {
  id: number
  title: string
  description: string
  class_name?: string
  rubric?: RubricCriterion[] | null
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function scoreColor(score: number, max: number) {
  const pct = score / max
  if (pct >= 0.75) return '#16a34a'
  if (pct >= 0.5) return '#d97706'
  return '#dc2626'
}

function ScoreResultCard({ result }: { result: RubricResult }) {
  const color = scoreColor(result.total_score, 5)
  return (
    <div style={{
      marginTop: '1.5rem',
      border: `2px solid ${color}40`,
      borderRadius: 12,
      overflow: 'hidden',
      background: `${color}08`
    }}>
      {/* Header */}
      <div style={{ background: color, padding: '14px 20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ color: 'white', fontWeight: 700, fontSize: 15 }}>⭐ Your Rubric Score</div>
        <div style={{ color: 'white', fontWeight: 800, fontSize: 22 }}>
          {result.total_score.toFixed(1)}<span style={{ fontWeight: 400, fontSize: 14, opacity: 0.85 }}> / 5</span>
        </div>
      </div>

      {/* Score bar */}
      <div style={{ padding: '0 20px', marginTop: 12 }}>
        <div style={{ height: 8, borderRadius: 999, background: '#e2e8f0', overflow: 'hidden' }}>
          <div style={{
            height: '100%',
            width: `${(result.total_score / 5) * 100}%`,
            background: color,
            borderRadius: 999,
            transition: 'width 0.6s ease'
          }} />
        </div>
      </div>

      {/* Breakdown table */}
      <div style={{ padding: '12px 20px 16px' }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.05em' }}>Per-Criterion Breakdown</div>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
          <thead>
            <tr style={{ borderBottom: '1.5px solid #e2e8f0' }}>
              <th style={{ textAlign: 'left', padding: '5px 0', color: '#64748b', fontWeight: 600 }}>Criterion</th>
              <th style={{ textAlign: 'center', padding: '5px 8px', color: '#64748b', fontWeight: 600 }}>Score</th>
              <th style={{ textAlign: 'center', padding: '5px 8px', color: '#64748b', fontWeight: 600 }}>Max</th>
              <th style={{ textAlign: 'left', padding: '5px 8px', color: '#64748b', fontWeight: 600 }}>Feedback</th>
            </tr>
          </thead>
          <tbody>
            {result.breakdown.map((r, i) => (
              <tr key={i} style={{ borderBottom: '1px solid #f1f5f9' }}>
                <td style={{ padding: '6px 0', fontWeight: 600 }}>{r.criterion}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: scoreColor(r.score, r.max_points) }}>{r.score}</td>
                <td style={{ padding: '6px 8px', textAlign: 'center', color: '#94a3b8' }}>{r.max_points}</td>
                <td style={{ padding: '6px 8px', fontSize: 12, color: '#64748b', fontStyle: 'italic' }}>{r.comment}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export default function StudentAssignmentPage() {
  const { token } = useParams()
  const [asn, setAsn] = useState<AssignmentOut | null>(null)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [success, setSuccess] = useState(false)
  const [rubricResult, setRubricResult] = useState<RubricResult | null>(null)
  const [err, setErr] = useState<string | null>(null)

  // Form state
  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  const [content, setContent] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [mode, setMode] = useState<'text' | 'file'>('text')

  async function loadAssignment() {
    try {
      const res = await apiFetch<AssignmentOut>(`/assignments/link/${token}`)
      setAsn(res)
    } catch (e: any) {
      setErr(e.message || 'Invalid or expired link')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadAssignment() }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    setSubmitting(true)
    const formData = new FormData()
    formData.append('token', token!)
    formData.append('student_name', name)
    formData.append('roll_no', roll)

    if (mode === 'text') {
      formData.append('content', content)
    } else if (file) {
      formData.append('file', file)
    }

    try {
      const res = await apiFetch<any>('/assignments/submit', { method: 'POST', body: formData })
      if (res.rubric_result) {
        setRubricResult(res.rubric_result)
      }
      setSuccess(true)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setSubmitting(false)
    }
  }

  // ── Loading / Error states ────────────────────────────────────────────────

  if (loading && !asn) return <div className="main center muted">Loading Assignment Portal...</div>

  if (err) return (
    <div className="main center stack">
      <div className="card" style={{ maxWidth: 400, margin: '2rem auto' }}>
        <h2 className="error">Access Denied</h2>
        <div className="muted">{err}</div>
      </div>
    </div>
  )

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) return (
    <div className="main center stack">
      <div className="card stack" style={{ maxWidth: 600, margin: '2rem auto', borderTop: '4px solid var(--success)' }}>
        <h2 style={{ color: 'var(--success)', margin: 0 }}>✓ Submission Received</h2>
        <div className="muted">Your assignment has been securely submitted and analyzed by the AI system.</div>

        <div style={{ marginTop: '0.5rem', padding: '12px', background: '#f0fdf4', borderRadius: 8, fontSize: 13, color: '#166534' }}>
          <b>Submission Token:</b> {token?.slice(0, 8)}...
        </div>

        {/* ML Rubric Score result */}
        {rubricResult && <ScoreResultCard result={rubricResult} />}

        {!rubricResult && (
          <div style={{ marginTop: '0.5rem', padding: 12, background: '#f8fafc', borderRadius: 8, fontSize: 13, color: '#64748b' }}>
            No rubric was set for this assignment — your submission has been recorded.
          </div>
        )}
      </div>
    </div>
  )

  // ── Main submission form ───────────────────────────────────────────────────

  const hasRubric = asn?.rubric && asn.rubric.length > 0

  return (
    <div className="main">
      <div className="card stack" style={{ maxWidth: 700, margin: '0 auto' }}>
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <div className="brand" style={{ fontSize: '1rem' }}>Student Assignment Portal</div>
          <div className="chip mixed">{asn?.class_name || 'General Class'}</div>
        </div>

        <div className="stack" style={{ gap: 8 }}>
          <h1 style={{ marginBottom: 0 }}>{asn?.title}</h1>
          <div className="muted">{asn?.description}</div>
        </div>

        {/* ── Grading Rubric Info Card ── */}
        {hasRubric && (
          <div style={{ border: '1.5px solid #bbf7d0', borderRadius: 10, overflow: 'hidden', background: '#f0fdf4' }}>
            <div style={{ padding: '10px 16px', background: '#dcfce7', display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 16 }}>⭐</span>
              <span style={{ fontWeight: 700, color: '#15803d', fontSize: 14 }}>Grading Rubric</span>
              <span style={{ color: '#16a34a', fontSize: 12 }}>— Your submission will be scored out of 5 by an ML model</span>
            </div>
            <div style={{ padding: '12px 16px' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #bbf7d0' }}>
                    <th style={{ textAlign: 'left', padding: '4px 0', color: '#15803d', fontWeight: 700 }}>Criterion</th>
                    <th style={{ textAlign: 'left', padding: '4px 8px', color: '#15803d', fontWeight: 700 }}>What we look for</th>
                    <th style={{ textAlign: 'center', padding: '4px 8px', color: '#15803d', fontWeight: 700 }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {asn!.rubric!.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #d1fae5' }}>
                      <td style={{ padding: '6px 0', fontWeight: 700, color: '#166534' }}>{r.criterion}</td>
                      <td style={{ padding: '6px 8px', color: '#15803d', fontSize: 12 }}>{r.expected || '—'}</td>
                      <td style={{ padding: '6px 8px', textAlign: 'center', fontWeight: 700, color: '#16a34a' }}>{r.max_points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        <hr style={{ border: 'none', borderBottom: '1.5px solid var(--border)', margin: '0.5rem 0' }} />

        <form onSubmit={onSubmit} className="stack">
          <div className="grid2">
            <div className="form-group">
              <label>Full Name</label>
              <input value={name} onChange={e => setName(e.target.value)} placeholder="e.g. John Doe" required />
            </div>
            <div className="form-group">
              <label>Roll Number</label>
              <input value={roll} onChange={e => setRoll(e.target.value)} placeholder="e.g. CS-123" required />
            </div>
          </div>

          <div className="stack" style={{ gap: 12 }}>
            <div className="row" style={{ gap: 16 }}>
              <button type="button" className={`btn ${mode === 'text' ? '' : 'ghost'}`} onClick={() => setMode('text')} style={{ fontSize: 13 }}>
                ✎ Text Entry
              </button>
              <button type="button" className={`btn ${mode === 'file' ? '' : 'ghost'}`} onClick={() => setMode('file')} style={{ fontSize: 13 }}>
                📁 File Upload
              </button>
            </div>

            {mode === 'text' ? (
              <div className="form-group">
                <label>Your Answer</label>
                <textarea
                  value={content}
                  onChange={e => setContent(e.target.value)}
                  placeholder="Write or paste your assignment answer here..."
                  style={{ minHeight: 250 }}
                  required
                />
              </div>
            ) : (
              <div className="form-group">
                <label>Upload Document (PDF, Word, Excel, PPT)</label>
                <div
                  className="card center"
                  style={{ border: '2px dashed var(--border)', padding: '2rem', cursor: 'pointer' }}
                  onClick={() => document.getElementById('file-input')?.click()}
                >
                  <div style={{ fontSize: 24, marginBottom: 8 }}>📄</div>
                  {file ? (
                    <div className="success">Selected: {file.name}</div>
                  ) : (
                    <div className="muted">Click to select file or drag & drop</div>
                  )}
                  <div className="small muted" style={{ marginTop: 8 }}>Supports PDF, Docx, Xlsx, Pptx</div>
                </div>
                <input
                  id="file-input"
                  type="file"
                  style={{ display: 'none' }}
                  onChange={e => setFile(e.target.files?.[0] || null)}
                  accept=".pdf,.docx,.doc,.xlsx,.xls,.pptx,.ppt"
                />
              </div>
            )}
          </div>

          <div style={{ background: '#f8fafc', padding: 12, borderRadius: 8, fontSize: 12 }} className="muted">
            <b>Notice:</b> All submissions are analyzed for AI-generation patterns
            {hasRubric ? ' and scored against the rubric above by an ML model.' : '.'}
          </div>

          <button
            className="btn"
            style={{ width: '100%', padding: '14px' }}
            disabled={submitting || (mode === 'file' && !file)}
          >
            {submitting ? '⏳ Processing Submission...' : 'Submit Assignment'}
          </button>
        </form>
      </div>
    </div>
  )
}
