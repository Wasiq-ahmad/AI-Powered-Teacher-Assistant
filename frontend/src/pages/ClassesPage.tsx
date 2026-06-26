import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../state/auth'

type SectionOut = {
  id: number
  name: string
}

type ClassOut = {
  id: number
  class_name: string
  professor_name?: string
  sections?: SectionOut[]
}

export default function ClassesPage() {
  const { token } = useAuth()
  const [items, setItems] = useState<ClassOut[]>([])
  const [className, setClassName] = useState('')
  const [sectionName, setSectionName] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  async function load() {
    setErr(null)
    setLoading(true)
    try {
      const res = await apiFetch<any>('/academics/get_class', { token })
      // backend returns either list or {"message": "..."}
      setItems(Array.isArray(res) ? res : [])
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load classes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function onCreate(e: FormEvent) {
    e.preventDefault()
    setErr(null)
    try {
      await apiFetch('/academics/class', {
        method: 'POST',
        token,
        body: JSON.stringify({ class_name: className, section_name: sectionName }),
      })
      setClassName('')
      setSectionName('')
      await load()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to create class')
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Delete this class? This will also delete associated courses/quizzes.')) return
    setErr(null)
    try {
      await apiFetch(`/academics/class_delete/${id}`, { method: 'DELETE', token })
      await load()
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to delete class')
    }
  }

  return (
    <div className="stack">
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Classes</h2>
        <form className="row" onSubmit={onCreate}>
          <input
            placeholder="Class name"
            value={className}
            onChange={(e) => setClassName(e.target.value)}
            required
            style={{ flex: 1 }}
          />
          <input
            placeholder="Section (Optional)"
            value={sectionName}
            onChange={(e) => setSectionName(e.target.value)}
            style={{ flex: 1 }}
          />
          <button className="btn" type="submit">
            Add
          </button>
          <button className="btn secondary" type="button" onClick={load} disabled={loading}>
            Refresh
          </button>
        </form>
        {err && <div className="error">{err}</div>}
      </div>

      <div className="card stack">
        <div className="muted">{loading ? 'Loading…' : `${items.length} class(es)`}</div>
        <div className="stack">
          {items.map((c) => (
            <div key={c.id} className="row" style={{ justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 600, fontSize: '1.2rem', marginBottom: '8px' }}>{c.class_name}</div>
                <hr />
                {c.sections && c.sections.length > 0 && (
                  <div className="row" style={{ gap: '8px', flexWrap: 'wrap' }}>
                    {c.sections.map(sec => (
                      <span key={sec.id} style={{ padding: '2px 8px', background: '#e0e0e0', borderRadius: '12px', fontSize: '0.85rem' }}>
                        Section {sec.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button className="btn danger" onClick={() => onDelete(c.id)}>
                Delete
              </button>
            </div>
          ))}
          {!loading && items.length === 0 && <div className="muted">No classes yet.</div>}
        </div>
      </div>
    </div>
  )
}

