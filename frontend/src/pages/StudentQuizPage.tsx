import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { apiFetch } from '../lib/api'

type QuizData = {
  quiz_id: number
  course: string
  class_name: string
  questions: Array<{
    text: string
    options: string[]
  }>
}

export default function StudentQuizPage() {
  const { token } = useParams()
  const [quiz, setQuiz] = useState<QuizData | null>(null)
  const [loading, setLoading] = useState(true)
  const [err, setErr] = useState<string | null>(null)
  
  // Student Info
  const [name, setName] = useState('')
  const [roll, setRoll] = useState('')
  
  // Quiz State
  const [answers, setAnswers] = useState<string[]>([])
  const [submitted, setSubmitted] = useState(false)
  const [finalScore, setFinalScore] = useState<string | null>(null)

  async function loadQuiz() {
    try {
      const res = await apiFetch<QuizData>(`/quizzes/student/${token}`)
      setQuiz(res)
      setAnswers(new Array(res.questions.length).fill(''))
    } catch (e: any) {
      setErr(e.message || 'Invalid or expired link')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadQuiz() }, [token])

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!name || !roll) return alert('Please enter your Name and Roll Number')
    if (answers.some(a => !a)) return alert('Please answer all questions before submitting')

    setLoading(true)
    try {
      const res = await apiFetch<any>('/quizzes/student/submit', {
        method: 'POST',
        body: JSON.stringify({
          token,
          student_name: name,
          roll_no: roll,
          answers
        })
      })
      setFinalScore(res.score)
      setSubmitted(true)
    } catch (e: any) {
      alert(e.message)
    } finally {
      setLoading(false)
    }
  }

  if (loading && !quiz) return <div className="main center muted">Connecting to Examination Server...</div>
  if (err) return <div className="main center stack"><div className="card"><h2>Access Denied</h2><div className="muted">{err}</div></div></div>

  if (submitted) {
    const [score, total] = finalScore?.split('/') || ['0', '0']
    const pct = (Number(score) / Number(total)) * 100
    
    return (
      <div className="main center stack" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '80vh' }}>
        <div className="card stack" style={{ maxWidth: 500, width: '100%', borderTop: `8px solid ${pct >= 50 ? 'var(--primary)' : 'var(--danger)'}`, padding: '3rem 2rem' }}>
          <div style={{ fontSize: '4rem' }}>{pct >= 50 ? '🏆' : '📝'}</div>
          <h1 style={{ margin: 0, fontSize: '2.5rem' }}>Quiz Results</h1>
          <div className="muted">Thank you, <b>{name}</b>. Your submission is complete.</div>
          
          <div className="stack" style={{ margin: '2rem 0', padding: '2rem', background: 'var(--background)', borderRadius: 20, border: '2px solid var(--border)' }}>
            <div className="muted font-bold small">FINAL SCORE</div>
            <div style={{ fontSize: '4rem', fontWeight: 800, color: 'var(--primary)', lineHeight: 1 }}>{finalScore}</div>
            <div style={{ marginTop: '0.5rem', fontWeight: 600, color: 'var(--secondary)' }}>
              {pct >= 90 ? 'Outstanding!' : pct >= 70 ? 'Great Job!' : pct >= 50 ? 'Good Effort.' : 'Keep Practicing.'}
            </div>
          </div>

          <div style={{ fontSize: 13 }} className="muted">
            The transcript for <b>{quiz?.class_name}</b> has been sent to your professor.
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="main stack">
      <div className="card stack" style={{ borderBottom: '4px solid var(--surface)' }}>
         <div className="row" style={{ justifyContent: 'space-between' }}>
            <div className="brand" style={{ fontSize: '0.9rem' }}>STUDENT EXAMINATION PORTAL</div>
            <div className="chip mixed">{quiz?.class_name}</div>
         </div>
         <h1 style={{ margin: 0 }}>Term Assessment: {quiz?.course}</h1>
         <div className="muted small">Please fill in your details and answer all questions carefully.</div>
      </div>

      <form onSubmit={onSubmit} className="stack">
        <div className="card grid2" style={{ background: 'var(--surface)', border: 'none' }}>
          <div className="form-group">
            <label>Student Full Name</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="Enter name" required />
          </div>
          <div className="form-group">
            <label>Roll Number / ID</label>
            <input value={roll} onChange={e => setRoll(e.target.value)} placeholder="Enter ID" required />
          </div>
        </div>

        <div className="stack" style={{ gap: 20, marginTop: '1rem' }}>
          {quiz?.questions.map((q, idx) => (
            <div key={idx} className="card stack">
              <div style={{ fontWeight: 600, fontSize: '1.1rem' }}>
                <span style={{ color: 'var(--primary)', marginRight: 8 }}>{idx + 1}.</span>
                {q.text}
              </div>
              <div className="stack" style={{ gap: 10, marginTop: 10 }}>
                {q.options.map((opt, i) => (
                  <label key={i} className="row card selectable" style={{ 
                    padding: '12px 16px', 
                    cursor: 'pointer',
                    background: answers[idx] === opt ? 'var(--surface)' : 'white',
                    borderColor: answers[idx] === opt ? 'var(--primary)' : 'var(--border)'
                  }}>
                    <input 
                      type="radio" 
                      name={`q-${idx}`} 
                      value={opt} 
                      checked={answers[idx] === opt} 
                      onChange={() => {
                        const newAns = [...answers]
                        newAns[idx] = opt
                        setAnswers(newAns)
                      }}
                      style={{ width: 'auto', marginRight: 12 }}
                    />
                    <span style={{ fontWeight: 500 }}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button className="btn" style={{ padding: '1.5rem', fontSize: '1.1rem', marginTop: '2rem' }} disabled={loading}>
          {loading ? 'Submitting Final Script...' : 'Submit Answers'}
        </button>
      </form>
    </div>
  )
}
