import { useEffect, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../state/auth'

// ── Types ──────────────────────────────────────────────────────────────────

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

type Submission = {
  id: number
  student_name: string
  roll_no: string
  ai_label: string
  ai_score: number
  ai_feedback: string
  rubric_score: number | null
  rubric_feedback: RubricBreakdown[] | null
  submitted_at: string
  original_filename?: string
}

type Assignment = {
  id: number
  title: string
  description: string
  class_name: string
  rubric: RubricCriterion[] | null
  created_at: string
}

// ── Helpers ─────────────────────────────────────────────────────────────────

function scoreColor(score: number, max = 5) {
  const pct = score / max
  if (pct >= 0.75) return '#16a34a'
  if (pct >= 0.5) return '#d97706'
  return '#dc2626'
}

function ScoreBadge({ score }: { score: number }) {
  const color = scoreColor(score)
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      background: `${color}18`, border: `1.5px solid ${color}40`,
      borderRadius: 999, padding: '4px 12px', fontSize: 13, fontWeight: 700, color
    }}>
      ⭐ {score.toFixed(1)} <span style={{ fontWeight: 400, color: '#64748b' }}>/ 5</span>
    </div>
  )
}

function BreakdownTable({ rows }: { rows: RubricBreakdown[] }) {
  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, marginTop: 8 }}>
      <thead>
        <tr style={{ background: 'var(--surface)' }}>
          <th style={{ textAlign: 'left', padding: '6px 8px', color: 'var(--muted)' }}>Criterion</th>
          <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--muted)' }}>Score</th>
          <th style={{ textAlign: 'center', padding: '6px 8px', color: 'var(--muted)' }}>Max</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((r, i) => (
          <tr key={i} style={{ borderTop: '1px solid var(--border)' }}>
            <td style={{ padding: '5px 8px', fontWeight: 600 }}>{r.criterion}</td>
            <td style={{ padding: '5px 8px', textAlign: 'center', color: scoreColor(r.score, r.max_points), fontWeight: 700 }}>{r.score}</td>
            <td style={{ padding: '5px 8px', textAlign: 'center', color: '#94a3b8' }}>{r.max_points}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

// ── Main Component ───────────────────────────────────────────────────────────

export default function AssignmentsPage() {
  const { token } = useAuth()
  const [classes, setClasses] = useState<any[]>([])
  const [assignments, setAssignments] = useState<Assignment[]>([])

  const [viewState, setViewState] = useState<'list' | 'view'>('list')
  const [selectedAsn, setSelectedAsn] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(false)
  const [shareLink, setShareLink] = useState<{ url: string; expires_at: string } | null>(null)
  const [expandedSub, setExpandedSub] = useState<number | null>(null)

  // Create modal
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [selectedClassId, setSelectedClassId] = useState('')
  const [rubricRows, setRubricRows] = useState<RubricCriterion[]>([
    { criterion: '', expected: '', max_points: 1 }
  ])
  const [enableRubric, setEnableRubric] = useState(false)

  const totalRubricPoints = rubricRows.reduce((s, r) => s + Number(r.max_points || 0), 0)

  async function loadData() {
    if (!token) return
    try {
      const [clsData, asnData] = await Promise.all([
        apiFetch<any[]>('/academics/get_class', { token }),
        apiFetch<Assignment[]>('/assignments/my', { token })
      ])
      setClasses(Array.isArray(clsData) ? clsData : [])
      setAssignments(asnData)
    } catch (e) { console.error(e) }
  }

  useEffect(() => { loadData() }, [token])

  // ── Rubric row helpers ──────────────────────────────────────────────────
  function addRubricRow() {
    if (rubricRows.length >= 6) return
    setRubricRows(r => [...r, { criterion: '', expected: '', max_points: 1 }])
  }

  function removeRubricRow(idx: number) {
    setRubricRows(r => r.filter((_, i) => i !== idx))
  }

  function updateRubricRow(idx: number, field: keyof RubricCriterion, value: string | number) {
    setRubricRows(rows => rows.map((r, i) => i === idx ? { ...r, [field]: value } : r))
  }

  // ── Create assignment ───────────────────────────────────────────────────
  async function onCreate() {
    if (!newTitle || !selectedClassId || !token) return
    if (enableRubric && totalRubricPoints > 5) {
      alert('Total rubric points cannot exceed 5.')
      return
    }
    setLoading(true)
    const formData = new FormData()
    formData.append('title', newTitle)
    formData.append('description', newDesc)
    formData.append('class_id', selectedClassId)

    if (enableRubric) {
      const validRows = rubricRows.filter(r => r.criterion.trim())
      if (validRows.length > 0) {
        formData.append('rubric', JSON.stringify(validRows))
      }
    }

    try {
      await apiFetch('/assignments/create', { method: 'POST', body: formData, token })
      setShowCreate(false)
      setNewTitle('')
      setNewDesc('')
      setRubricRows([{ criterion: '', expected: '', max_points: 1 }])
      setEnableRubric(false)
      loadData()
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function onSelectAssignment(asn: Assignment) {
    setSelectedAsn(asn)
    setShareLink(null)
    setExpandedSub(null)
    setLoading(true)
    try {
      const subs = await apiFetch<Submission[]>(`/assignments/${asn.id}/submissions`, { token })
      setSubmissions(subs)
      setViewState('view')
    } catch { setSubmissions([]) }
    finally { setLoading(false) }
  }

  async function onGenerateLink() {
    if (!selectedAsn || !token) return
    setLoading(true)
    try {
      const res = await apiFetch<any>(`/assignments/${selectedAsn.id}/generate-link`, { method: 'POST', token })
      setShareLink(res)
    } catch (e: any) { alert(e.message) }
    finally { setLoading(false) }
  }

  async function onDownload(s: Submission) {
    try {
      const res = await fetch(`http://localhost:8000/assignments/${s.id}/download`, {
        headers: { 'Authorization': `Bearer ${token}` }
      })
      if (res.ok) {
        const blob = await res.blob()
        const url = window.URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = s.original_filename || 'submission'
        a.click()
      } else { alert('Failed to download file') }
    } catch (e) { console.error(e) }
  }

  // ══════════════════════════════════════════════════════════════════════════
  // VIEW: Submission detail
  // ══════════════════════════════════════════════════════════════════════════
  if (viewState === 'view' && selectedAsn) {
    const hasRubric = selectedAsn.rubric && selectedAsn.rubric.length > 0

    return (
      <div className="main stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn secondary small" onClick={() => setViewState('list')}>← Back to Overview</button>
          <div style={{ display: 'flex', gap: 8 }}>
            <div className="chip mixed">AI Integrity Review</div>
            {hasRubric && <div className="chip" style={{ background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0' }}>⭐ ML Rubric Scoring</div>}
          </div>
        </div>

        <div className="card stack">
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'flex-start' }}>
            <div className="stack" style={{ gap: 4 }}>
              <div className="row" style={{ gap: 8 }}>
                <div className="chip small mixed" style={{ background: 'var(--surface)', color: 'var(--primary)' }}>{selectedAsn.class_name}</div>
                <div className="muted extra-small">• Created {new Date(selectedAsn.created_at).toLocaleDateString()}</div>
              </div>
              <h1 style={{ margin: 0 }}>{selectedAsn.title}</h1>
              <p className="muted">{selectedAsn.description}</p>
            </div>

            <div className="stack" style={{ alignItems: 'flex-end', gap: 12 }}>
              <button className="btn" onClick={onGenerateLink} disabled={loading}>
                {loading ? 'Processing...' : 'Generate Portal Link'}
              </button>
              {shareLink && (
                <div className="card stack" style={{ background: 'var(--background)', borderColor: 'var(--border)', padding: 12, maxWidth: 350 }}>
                  <div className="extra-small font-bold muted">STUDENT PORTAL URL</div>
                  <div className="row" style={{ gap: 8 }}>
                    <input readOnly value={shareLink.url} style={{ background: 'white', fontSize: 11, padding: 6, border: '1px solid var(--border)' }} onClick={e => (e.target as any).select()} />
                    <button className="btn small ghost" onClick={() => navigator.clipboard.writeText(shareLink.url)}>📋</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Rubric preview for teacher */}
          {hasRubric && (
            <div style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 8, padding: '12px 16px' }}>
              <div style={{ fontWeight: 700, fontSize: 13, color: '#15803d', marginBottom: 8 }}>📋 Grading Rubric (ML Scored out of 5)</div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {selectedAsn.rubric!.map((r, i) => (
                  <div key={i} style={{ background: 'white', border: '1px solid #d1fae5', borderRadius: 6, padding: '6px 12px', fontSize: 12 }}>
                    <span style={{ fontWeight: 700 }}>{r.criterion}</span>
                    <span style={{ color: '#16a34a', marginLeft: 6 }}>{r.max_points} pts</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          <hr style={{ border: 'none', borderBottom: '1.5px solid var(--border)', margin: '0.5rem 0' }} />

          <div className="row" style={{ justifyContent: 'space-between' }}>
            <h3 style={{ margin: 0 }}>Student Submissions ({submissions.length})</h3>
          </div>

          <div className="grid3" style={{ marginTop: '1rem' }}>
            {submissions.map(s => (
              <div key={s.id} className="card stack" style={{
                gap: 12,
                borderTop: `4px solid ${s.rubric_score != null ? scoreColor(s.rubric_score) : (s.ai_label === 'AI' ? '#d97706' : 'var(--primary)')}`
              }}>
                {/* Rubric score badge — prominent */}
                {s.rubric_score != null && (
                  <ScoreBadge score={s.rubric_score} />
                )}

                <div className={`chip ${s.ai_label?.toLowerCase()}`}>
                  {s.ai_label} Confidence: {s.ai_score}%
                </div>

                <div>
                  <div style={{ fontWeight: 700 }}>{s.student_name}</div>
                  <div className="muted small">ID: {s.roll_no}</div>
                </div>

                <div className="muted extra-small italic" style={{ padding: 8, background: '#f8fafc', borderRadius: 4, maxHeight: 60, overflow: 'hidden' }}>
                  "{s.ai_feedback}"
                </div>

                {/* Rubric breakdown toggle */}
                {s.rubric_feedback && s.rubric_feedback.length > 0 && (
                  <div>
                    <button
                      className="btn ghost small"
                      style={{ width: '100%', fontSize: 12 }}
                      onClick={() => setExpandedSub(expandedSub === s.id ? null : s.id)}
                    >
                      {expandedSub === s.id ? '▲ Hide Breakdown' : '▼ View Rubric Breakdown'}
                    </button>
                    {expandedSub === s.id && <BreakdownTable rows={s.rubric_feedback} />}
                  </div>
                )}

                {s.original_filename && (
                  <div className="row" style={{ background: 'var(--surface)', padding: '8px 12px', borderRadius: 6, justifyContent: 'space-between' }}>
                    <div className="row" style={{ gap: 8, fontSize: 12 }}>
                      <span>📄</span>
                      <span style={{ maxWidth: 100, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 600 }}>{s.original_filename}</span>
                    </div>
                    <button className="btn small ghost" style={{ background: 'white' }} onClick={() => onDownload(s)}>Save</button>
                  </div>
                )}

                <div className="muted extra-small">{new Date(s.submitted_at).toLocaleString()}</div>
              </div>
            ))}
          </div>
          {submissions.length === 0 && <div className="muted center" style={{ padding: '6rem' }}>Waiting for student submissions...</div>}
        </div>
      </div>
    )
  }

  // ══════════════════════════════════════════════════════════════════════════
  // LIST VIEW
  // ══════════════════════════════════════════════════════════════════════════
  return (
    <div className="main stack">
      <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--surface)' }}>
        <div>
          <h1 style={{ margin: 0 }}>AI Integrity + Rubric Review</h1>
          <div className="muted small">Analyze assignments · Detect AI content · ML rubric scoring</div>
        </div>
        <button className="btn" onClick={() => setShowCreate(true)}>Create New Assignment</button>
      </div>

      <div className="grid2">
        {loading ? <div className="muted center" style={{ gridColumn: 'span 2', padding: '4rem' }}>Synchronizing...</div> : (
          <>
            {assignments.map(asn => (
              <div key={asn.id} className="card stack selectable" onClick={() => onSelectAssignment(asn)}>
                <div className="row" style={{ justifyContent: 'space-between' }}>
                  <div className="chip small mixed" style={{ background: 'var(--surface)', color: 'var(--primary)' }}>{asn.class_name}</div>
                  <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                    {asn.rubric && asn.rubric.length > 0 && (
                      <span style={{ fontSize: 11, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: 999, padding: '2px 8px', fontWeight: 600 }}>⭐ Rubric</span>
                    )}
                    <div className="muted extra-small">{new Date(asn.created_at).toLocaleDateString()}</div>
                  </div>
                </div>
                <div style={{ fontWeight: 700, fontSize: '1.25rem', color: 'var(--primary)' }}>{asn.title}</div>
                <div className="muted small line-clamp-2">{asn.description}</div>
                <div className="row" style={{ marginTop: '1rem', justifySelf: 'flex-end' }}>
                  <button className="btn secondary small">Review →</button>
                </div>
              </div>
            ))}
            {assignments.length === 0 && <div className="muted center" style={{ gridColumn: 'span 2', padding: '4rem' }}>No assignments yet.</div>}
          </>
        )}
      </div>

      {/* ── Create Assignment Modal ── */}
      {showCreate && (
        <div className="modal-overlay">
          <div className="modal-card stack" style={{ width: 580, maxHeight: '90vh', overflowY: 'auto', backgroundColor: 'var(--background)' }}>
            <h2 style={{ margin: 0 }}>Create New Assignment</h2>

            <div className="form-group">
              <label>Target Class</label>
              <select value={selectedClassId} onChange={e => setSelectedClassId(e.target.value)} style={{ background: 'white' }}>
                <option value="">Select a Class...</option>
                {classes.map(c => <option key={c.id} value={c.id}>{c.class_name}</option>)}
              </select>
            </div>
            <div className="form-group">
              <label>Assignment Title</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="e.g. Modern History Essay" style={{ background: 'white' }} />
            </div>
            <div className="form-group">
              <label>Instructions / Description</label>
              <textarea value={newDesc} onChange={e => setNewDesc(e.target.value)} placeholder="Details for students..." style={{ minHeight: 100, background: 'white' }} />
            </div>

            {/* ── Rubric Builder ── */}
            <div style={{ border: '1.5px solid var(--border)', borderRadius: 10, overflow: 'hidden' }}>
              <div
                style={{ padding: '10px 16px', background: enableRubric ? '#f0fdf4' : 'var(--surface)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', cursor: 'pointer' }}
                onClick={() => setEnableRubric(e => !e)}
              >
                <div>
                  <span style={{ fontWeight: 700, fontSize: 14, color: enableRubric ? '#15803d' : 'var(--text)' }}>⭐ Rubric-Based ML Scoring</span>
                  <span className="muted" style={{ fontSize: 12, marginLeft: 8 }}>Define criteria · Scored out of 5 by ML model</span>
                </div>
                <div style={{
                  width: 40, height: 22, borderRadius: 999,
                  background: enableRubric ? '#16a34a' : '#cbd5e1',
                  position: 'relative', transition: 'background 0.2s'
                }}>
                  <div style={{
                    width: 16, height: 16, borderRadius: '50%', background: 'white',
                    position: 'absolute', top: 3,
                    left: enableRubric ? 20 : 4,
                    transition: 'left 0.2s'
                  }} />
                </div>
              </div>

              {enableRubric && (
                <div style={{ padding: '12px 16px' }} className="stack">
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ fontSize: 12, color: '#64748b' }}>
                      Total: <span style={{ fontWeight: 700, color: totalRubricPoints > 5 ? '#dc2626' : '#16a34a' }}>{totalRubricPoints}</span> / 5 pts
                      {totalRubricPoints > 5 && <span style={{ color: '#dc2626', marginLeft: 8 }}>⚠ Exceeds 5!</span>}
                    </div>
                    <button type="button" className="btn ghost small" onClick={addRubricRow} disabled={rubricRows.length >= 6} style={{ fontSize: 12 }}>
                      + Add Criterion
                    </button>
                  </div>

                  {rubricRows.map((row, idx) => (
                    <div key={idx} style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 12, background: '#fafafa' }} className="stack">
                      <div className="row" style={{ gap: 8, alignItems: 'center' }}>
                        <div style={{ flex: 1 }}>
                          <input
                            value={row.criterion}
                            onChange={e => updateRubricRow(idx, 'criterion', e.target.value)}
                            placeholder={`Criterion ${idx + 1} (e.g. Clarity)`}
                            style={{ background: 'white', fontSize: 13, width: '100%' }}
                          />
                        </div>
                        <div style={{ width: 70 }}>
                          <input
                            type="number"
                            min={0.5} max={5} step={0.5}
                            value={row.max_points}
                            onChange={e => updateRubricRow(idx, 'max_points', parseFloat(e.target.value) || 1)}
                            style={{ background: 'white', fontSize: 13, textAlign: 'center' }}
                          />
                        </div>
                        <span style={{ fontSize: 11, color: '#94a3b8', whiteSpace: 'nowrap' }}>pts</span>
                        {rubricRows.length > 1 && (
                          <button type="button" onClick={() => removeRubricRow(idx)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#dc2626', fontSize: 16, padding: '0 4px' }}>✕</button>
                        )}
                      </div>
                      <textarea
                        value={row.expected}
                        onChange={e => updateRubricRow(idx, 'expected', e.target.value)}
                        placeholder="Expected content / what a good answer looks like..."
                        style={{ minHeight: 60, background: 'white', fontSize: 12, marginTop: 4 }}
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="row" style={{ justifyContent: 'flex-end', marginTop: '0.5rem', gap: 12 }}>
              <button className="btn ghost" onClick={() => { setShowCreate(false); setEnableRubric(false); setRubricRows([{ criterion: '', expected: '', max_points: 1 }]) }}>Discard</button>
              <button className="btn" onClick={onCreate} disabled={loading || (enableRubric && totalRubricPoints > 5)}>
                {loading ? 'Creating...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
