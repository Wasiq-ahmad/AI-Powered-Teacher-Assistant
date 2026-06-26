// import { useEffect, useState } from 'react'
// import { apiFetch } from '../lib/api'
// import { useAuth } from '../state/auth'

// type CourseOut = {
//   id: number
//   name: string
//   class_name: string
// }

// type QuizOut = {
//   id: number
//   quiz_number: number
//   weeks_range: string
//   questions: string
//   course_name?: string
//   class_name?: string
// }

// type QuizResultOut = {
//   id: number
//   student_name: string
//   roll_no: string
//   score: number
//   total: number
// }

// export default function QuizzesPage() {
//   const { token } = useAuth()
//   const [courses, setCourses] = useState<CourseOut[]>([])
//   const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
//   const [selectedClassFilter, setSelectedClassFilter] = useState<string>('')

//   const [quizzes, setQuizzes] = useState<QuizOut[]>([])
//   const [loading, setLoading] = useState(false)
//   const [err, setErr] = useState<string | null>(null)

//   // View States for "Dedicated Page" feel
//   const [activeQuizId, setActiveQuizId] = useState<number | null>(null)
//   const [viewState, setViewState] = useState<'list' | 'results' | 'preview' | 'share'>('list')

//   const [shareLink, setShareLink] = useState<string | null>(null)
//   const [results, setResults] = useState<QuizResultOut[]>([])

//   async function loadCourses() {
//     try {
//       const res = await apiFetch<CourseOut[]>('/courses/my_courses', { token })
//       setCourses(res)
//     } catch { }
//   }

//   async function loadQuizzes(courseId: number) {
//     setLoading(true)
//     setErr(null)
//     try {
//       const res = await apiFetch<QuizOut[]>(`/quizzes/${courseId}/quizzes`, { token })
//       setQuizzes(res.sort((a, b) => a.quiz_number - b.quiz_number))
//     } catch (e: any) {
//       setErr(e?.message ?? 'Failed to load quizzes')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => { loadCourses() }, [])
//   useEffect(() => { if (selectedCourseId) loadQuizzes(selectedCourseId) }, [selectedCourseId])

//   // Derive unique classes from courses
//   const uniqueClasses = Array.from(new Set(courses.map(c => c.class_name))).filter(Boolean)

//   // Filter courses based on selected class
//   const filteredCourses = selectedClassFilter
//     ? courses.filter(c => c.class_name === selectedClassFilter)
//     : courses

//   async function onShare(quizId: number) {
//     setActiveQuizId(quizId)
//     try {
//       const res = await apiFetch<any>(`/quizzes/quiz/${quizId}/generate-link`, { method: 'POST', token })
//       setShareLink(res.url)
//       setViewState('share')
//     } catch (e: any) { alert(e?.message) }
//   }

//   async function onViewResults(quizId: number) {
//     setActiveQuizId(quizId)
//     setViewState('results')
//     loadResults(quizId)
//   }

//   async function onPreviewQuiz(quizId: number) {
//     setActiveQuizId(quizId)
//     setViewState('preview')
//   }

//   async function loadResults(quizId: number) {
//     try {
//       const res = await apiFetch<QuizResultOut[]>(`/quizzes/quiz/${quizId}/results`, { token })
//       setResults(res)
//     } catch { }
//   }

//   async function onDeleteQuiz(id: number) {
//     if (!confirm('Delete this quiz and all student results?')) return
//     try {
//       await apiFetch(`/quizzes/quiz/${id}`, { method: 'DELETE', token })
//       if (selectedCourseId) loadQuizzes(selectedCourseId)
//       setViewState('list')
//     } catch (e: any) { alert(e?.message) }
//   }

//   useEffect(() => {
//     let interval: any
//     if (viewState === 'results' && activeQuizId) {
//       interval = setInterval(() => loadResults(activeQuizId), 5000)
//     }
//     return () => clearInterval(interval)
//   }, [viewState, activeQuizId])

//   const activeQuiz = quizzes.find(q => q.id === activeQuizId)

//   // RENDER DEDICATED PAGES
//   if (viewState === 'results' && activeQuiz) {
//     return (
//       <div className="main stack">
//         <div className="row" style={{ justifyContent: 'space-between' }}>
//           <button className="btn secondary small" onClick={() => setViewState('list')}>← Back to List</button>
//           <div className="chip success">Live Results</div>
//         </div>
//         <div className="card stack">
//           <div className="row" style={{ gap: 8 }}>
//             <div className="chip small mixed">{activeQuiz.class_name}</div>
//             <div className="muted extra-small">• {activeQuiz.course_name}</div>
//           </div>
//           <h1>Student Results: Quiz #{activeQuiz.quiz_number}</h1>
//           <div className="muted">Monitoring student performance in real-time.</div>

//           <div className="grid3" style={{ marginTop: '1rem' }}>
//             {results.map(r => (
//               <div key={r.id} className="card stack" style={{ background: 'var(--surface)', border: 'none', padding: '1rem' }}>
//                 <div className="row" style={{ justifyContent: 'space-between' }}>
//                   <div style={{ fontWeight: 700, color: 'var(--primary)' }}>{r.score} / {r.total}</div>
//                   <div className="chip human" style={{ fontSize: 10 }}>Passed</div>
//                 </div>
//                 <div>
//                   <div style={{ fontWeight: 600 }}>{r.student_name}</div>
//                   <div className="muted small">Roll: {r.roll_no}</div>
//                 </div>
//               </div>
//             ))}
//           </div>
//           {results.length === 0 && <div className="muted center" style={{ padding: '4rem' }}>No student submissions yet.</div>}
//         </div>
//       </div>
//     )
//   }

//   if (viewState === 'preview' && activeQuiz) {
//     return (
//       <div className="main stack">
//         <div className="row" style={{ justifyContent: 'space-between' }}>
//           <button className="btn secondary small" onClick={() => setViewState('list')}>← Back to List</button>
//           <div className="chip mixed">Questions Preview</div>
//         </div>
//         <div className="card stack">
//           <div className="row" style={{ gap: 8 }}>
//             <div className="chip small mixed">{activeQuiz.class_name}</div>
//             <div className="muted extra-small">• {activeQuiz.course_name}</div>
//           </div>
//           <h1>Quiz #{activeQuiz.quiz_number} Content</h1>
//           <div className="stack" style={{ gap: 16, marginTop: '1.5rem' }}>
//             {JSON.parse(activeQuiz.questions || '[]').map((q: any, idx: number) => (
//               <div key={idx} className="card" style={{ background: 'var(--background)', border: '1.5px solid var(--border)' }}>
//                 <div style={{ fontWeight: 600, marginBottom: 8 }}>{idx + 1}. {q.text}</div>
//                 <div className="grid2" style={{ gap: 8 }}>
//                   {q.options.map((opt: string, i: number) => (
//                     <div key={i} className="small" style={{
//                       padding: 8,
//                       borderRadius: 6,
//                       background: opt === q.correct ? 'var(--surface)' : 'white',
//                       border: opt === q.correct ? '1px solid var(--primary)' : '1px solid var(--border)',
//                       color: opt === q.correct ? 'var(--primary)' : 'inherit'
//                     }}>
//                       {opt} {opt === q.correct && '✓'}
//                     </div>
//                   ))}
//                 </div>
//               </div>
//             ))}
//           </div>
//         </div>
//       </div>
//     )
//   }

//   if (viewState === 'share' && activeQuiz) {
//     return (
//       <div className="main stack center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
//         <div className="card stack" style={{ maxWidth: 500, width: '100%', borderTop: '4px solid var(--primary)' }}>
//           <div className="brand" style={{ fontSize: '0.8rem' }}>QUIZ DISTRIBUTION PORTAL</div>
//           <h2 style={{ margin: 0 }}>Quiz #{activeQuiz.quiz_number} Ready</h2>
//           <div className="muted small">Share this secure link with your {activeQuiz.class_name} students.</div>

//           <div className="stack" style={{ background: 'var(--background)', padding: 16, borderRadius: 12, border: '1px dashed var(--border)', marginTop: '1rem' }}>
//             <div className="extra-small font-bold muted">SHAREABLE URL</div>
//             <div style={{ wordBreak: 'break-all', fontWeight: 600, color: 'var(--primary)', margin: '8px 0' }}>{shareLink}</div>
//             <button className="btn small" onClick={() => {
//               navigator.clipboard.writeText(shareLink!);
//               alert('Portal link copied!');
//             }}>Copy Secure Link</button>
//           </div>

//           <button className="btn secondary" onClick={() => setViewState('list')} style={{ marginTop: '1rem' }}>Return to Dashboard</button>
//         </div>
//       </div>
//     )
//   }

//   // DEFAULT LIST VIEW
//   return (
//     <div className="main stack">
//       <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--surface)' }}>
//         <div>
//           <h1 style={{ margin: 0 }}>Academic Quizzes</h1>
//           <div className="muted small">Manage assessments and track performance</div>
//         </div>

//         <div className="row" style={{ gap: 12 }}>
//           {/* Class Filter */}
//           <div className="form-group" style={{ minWidth: 200 }}>
//             <label className="extra-small">1. Select Class</label>
//             <select value={selectedClassFilter} onChange={e => {
//               setSelectedClassFilter(e.target.value);
//               setSelectedCourseId(null); // Reset course when class changes
//             }}>
//               <option value="">All Classes</option>
//               {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
//             </select>
//           </div>

//           {/* Course Filter */}
//           <div className="form-group" style={{ minWidth: 200 }}>
//             <label className="extra-small">2. Select Course</label>
//             <select value={selectedCourseId ?? ''} onChange={e => setSelectedCourseId(Number(e.target.value))}>
//               <option value="">Select Course...</option>
//               {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
//             </select>
//           </div>
//         </div>
//       </div>

//       {err && (
//         <div className="card" style={{ borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
//           <div style={{ color: '#d97706', fontWeight: 600 }}>Sync Error</div>
//           <div className="muted small">{err}</div>
//         </div>
//       )}

//       <div className="card stack">
//         {loading ? <div className="muted center" style={{ padding: '2rem' }}>Synchronizing quiz data...</div> : (
//           <div className="stack" style={{ gap: 12 }}>
//             {quizzes.map(q => (
//               <div key={q.id} className="card row" style={{ justifyContent: 'space-between', padding: '1rem', background: 'white' }}>
//                 <div className="stack" style={{ gap: 4 }}>
//                   <div className="row" style={{ gap: 8 }}>
//                     <div className="chip small mixed" style={{ background: 'var(--surface)', color: 'var(--primary)' }}>{q.class_name}</div>
//                     <div className="muted extra-small">{q.course_name}</div>
//                   </div>
//                   <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quiz #{q.quiz_number}</div>
//                   <div className="muted small">Coverage: Weeks {q.weeks_range}</div>
//                 </div>
//                 <div className="row" style={{ gap: 12 }}>
//                   <button className="btn ghost small" style={{ border: '1.5px solid var(--border)' }} onClick={() => onPreviewQuiz(q.id)}>Preview</button>
//                   <button className="btn secondary small" onClick={() => onShare(q.id)}>Share</button>
//                   <button className="btn small" onClick={() => onViewResults(q.id)}>Results</button>
//                   <button className="btn danger small" style={{ background: '#fee2e2', border: 'none' }} onClick={() => onDeleteQuiz(q.id)}>Delete</button>
//                 </div>
//               </div>
//             ))}
//             {!selectedCourseId && <div className="muted center" style={{ padding: '3rem' }}>Please select a Class and Course to view quizzes.</div>}
//             {selectedCourseId && quizzes.length === 0 && <div className="muted center" style={{ padding: '3rem' }}>No quizzes generated for this course yet.</div>}
//           </div>
//         )}
//       </div>
//     </div>
//   )
// }















import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../lib/api'
import { useAuth } from '../state/auth'

type CourseOut = {
  id: number
  name: string
  class_name: string
}

type QuizOut = {
  id: number
  quiz_number: number
  weeks_range: string
  questions: string
  course_name?: string
  class_name?: string
}

type QuizResultOut = {
  id: number
  student_name: string
  roll_no: string
  score: number
  total: number
  answers?: string[]
}

type QuizQuestion = {
  text: string
  options: string[]
  correct: string
}

export default function QuizzesPage() {
  const { token } = useAuth()
  const [courses, setCourses] = useState<CourseOut[]>([])
  const [selectedCourseId, setSelectedCourseId] = useState<number | null>(null)
  const [selectedClassFilter, setSelectedClassFilter] = useState<string>('')

  const [quizzes, setQuizzes] = useState<QuizOut[]>([])
  const [loading, setLoading] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  const [activeQuizId, setActiveQuizId] = useState<number | null>(null)
  const [viewState, setViewState] = useState<'list' | 'results' | 'preview' | 'share'>('list')

  const [shareLink, setShareLink] = useState<string | null>(null)
  const [results, setResults] = useState<QuizResultOut[]>([])

  // Results sub-state
  const [resultFilter, setResultFilter] = useState<'all' | 'best' | 'worst'>('all')
  const [detailStudent, setDetailStudent] = useState<QuizResultOut | null>(null)

  const detailRef = useRef<HTMLDivElement>(null)

  async function loadCourses() {
    try {
      const res = await apiFetch<CourseOut[]>('/courses/my_courses', { token })
      setCourses(res)
    } catch { }
  }

  async function loadQuizzes(courseId: number) {
    setLoading(true)
    setErr(null)
    try {
      const res = await apiFetch<QuizOut[]>(`/quizzes/${courseId}/quizzes`, { token })
      setQuizzes(res.sort((a, b) => a.quiz_number - b.quiz_number))
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load quizzes')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { loadCourses() }, [])
  useEffect(() => { if (selectedCourseId) loadQuizzes(selectedCourseId) }, [selectedCourseId])

  const uniqueClasses = Array.from(new Set(courses.map(c => c.class_name))).filter(Boolean)
  const filteredCourses = selectedClassFilter
    ? courses.filter(c => c.class_name === selectedClassFilter)
    : courses

  async function onShare(quizId: number) {
    setActiveQuizId(quizId)
    try {
      const res = await apiFetch<any>(`/quizzes/quiz/${quizId}/generate-link`, { method: 'POST', token })
      setShareLink(res.url)
      setViewState('share')
    } catch (e: any) { alert(e?.message) }
  }

  async function onViewResults(quizId: number) {
    setActiveQuizId(quizId)
    setViewState('results')
    setResultFilter('all')
    setDetailStudent(null)
    loadResults(quizId)
  }

  async function onPreviewQuiz(quizId: number) {
    setActiveQuizId(quizId)
    setViewState('preview')
  }

  async function loadResults(quizId: number) {
    try {
      const res = await apiFetch<QuizResultOut[]>(`/quizzes/quiz/${quizId}/results`, { token })
      setResults(res)
    } catch { }
  }

  async function onDeleteQuiz(id: number) {
    if (!confirm('Delete this quiz and all student results?')) return
    try {
      await apiFetch(`/quizzes/quiz/${id}`, { method: 'DELETE', token })
      if (selectedCourseId) loadQuizzes(selectedCourseId)
      setViewState('list')
    } catch (e: any) { alert(e?.message) }
  }

  useEffect(() => {
    let interval: any
    if (viewState === 'results' && activeQuizId) {
      interval = setInterval(() => loadResults(activeQuizId), 5000)
    }
    return () => clearInterval(interval)
  }, [viewState, activeQuizId])

  const activeQuiz = quizzes.find(q => q.id === activeQuizId)

  // Compute best and worst
  const bestResult = results.length > 0
    ? results.reduce((a, b) => a.score > b.score ? a : b)
    : null
  const worstResult = results.length > 0
    ? results.reduce((a, b) => a.score < b.score ? a : b)
    : null

  const displayedResults =
    resultFilter === 'best' ? (bestResult ? [bestResult] : []) :
      resultFilter === 'worst' ? (worstResult ? [worstResult] : []) :
        results

  // Parse questions for detail view
  const parsedQuestions: QuizQuestion[] = activeQuiz
    ? (() => { try { return JSON.parse(activeQuiz.questions || '[]') } catch { return [] } })()
    : []

  // Download detail card as screenshot
  async function handleDownload() {
    if (!detailRef.current) return
    try {
      // Dynamically load html2canvas
      const html2canvas = (await import('https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.esm.js' as any)).default
      const canvas = await html2canvas(detailRef.current, { scale: 2, useCORS: true, backgroundColor: '#ffffff' })
      const link = document.createElement('a')
      link.download = `quiz-result-${detailStudent?.roll_no}-quiz${activeQuiz?.quiz_number}.png`
      link.href = canvas.toDataURL('image/png')
      link.click()
    } catch {
      // Fallback: use window.print for the card
      window.print()
    }
  }

  // ---------- RESULTS VIEW ----------
  if (viewState === 'results' && activeQuiz) {

    // Student detail overlay
    if (detailStudent) {
      const pct = Math.round((detailStudent.score / detailStudent.total) * 100)
      return (
        <div className="main stack">
          {/* Top bar */}
          <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <button className="btn secondary small" onClick={() => setDetailStudent(null)}>← Back to Results</button>
            <button className="btn small" onClick={handleDownload}>⬇ Download as Image</button>
          </div>

          {/* Printable / downloadable card */}
          <div ref={detailRef} style={{
            background: '#ffffff',
            border: '2px solid var(--border)',
            borderRadius: 16,
            padding: '2rem',
            maxWidth: 720,
            margin: '0 auto',
            width: '100%',
          }}>
            {/* Header strip */}
            <div style={{
              background: 'var(--primary)',
              color: '#fff',
              borderRadius: 10,
              padding: '1rem 1.5rem',
              marginBottom: '1.5rem',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: 8,
            }}>
              <div>
                <div style={{ fontSize: 11, opacity: 0.75, textTransform: 'uppercase', letterSpacing: 1 }}>Quiz Result Card</div>
                <div style={{ fontWeight: 800, fontSize: '1.25rem' }}>Quiz #{activeQuiz.quiz_number}</div>
                <div style={{ fontSize: 13, opacity: 0.85 }}>{activeQuiz.course_name} — {activeQuiz.class_name}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: 11, opacity: 0.75 }}>Score</div>
                <div style={{ fontWeight: 800, fontSize: '2rem', lineHeight: 1 }}>{detailStudent.score}/{detailStudent.total}</div>
                <div style={{ fontSize: 12, opacity: 0.8 }}>{pct}%</div>
              </div>
            </div>

            {/* Student meta */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(3, 1fr)',
              gap: 12,
              marginBottom: '1.5rem',
            }}>
              {[
                { label: 'Student Name', value: detailStudent.student_name },
                { label: 'Roll No', value: detailStudent.roll_no },
                { label: 'Class', value: activeQuiz.class_name },
              ].map(item => (
                <div key={item.label} style={{
                  background: 'var(--surface, #f8fafc)',
                  borderRadius: 8,
                  padding: '0.65rem 1rem',
                  border: '1px solid var(--border)',
                }}>
                  <div style={{ fontSize: 10, color: 'var(--muted, #888)', textTransform: 'uppercase', letterSpacing: 0.5 }}>{item.label}</div>
                  <div style={{ fontWeight: 700, marginTop: 2 }}>{item.value}</div>
                </div>
              ))}
            </div>

            {/* Questions */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
              {parsedQuestions.map((q, idx) => {
                const studentAnswer = detailStudent.answers?.[idx]
                const isCorrect = studentAnswer === q.correct
                return (
                  <div key={idx} style={{
                    border: '1.5px solid var(--border)',
                    borderRadius: 10,
                    overflow: 'hidden',
                  }}>
                    {/* Question text */}
                    <div style={{
                      background: 'var(--surface, #f8fafc)',
                      padding: '0.65rem 1rem',
                      fontWeight: 600,
                      fontSize: 14,
                      borderBottom: '1px solid var(--border)',
                    }}>
                      {idx + 1}. {q.text}
                    </div>
                    {/* Options grid */}
                    <div style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: 8,
                      padding: '0.75rem',
                    }}>
                      {q.options.map((opt, i) => {
                        const isSelected = opt === studentAnswer
                        const isCorrectOpt = opt === q.correct
                        let bg = '#f9fafb'
                        let border = '1px solid #e5e7eb'
                        let color = 'inherit'
                        let icon = ''

                        if (isCorrectOpt && isSelected) {
                          bg = '#dcfce7'; border = '1.5px solid #16a34a'; color = '#15803d'; icon = '✓'
                        } else if (isSelected && !isCorrectOpt) {
                          bg = '#fee2e2'; border = '1.5px solid #dc2626'; color = '#b91c1c'; icon = '✗'
                        } else if (isCorrectOpt) {
                          bg = '#dcfce7'; border = '1.5px solid #16a34a'; color = '#15803d'; icon = '✓'
                        }

                        return (
                          <div key={i} style={{
                            padding: '0.5rem 0.75rem',
                            borderRadius: 6,
                            background: bg,
                            border,
                            color,
                            fontSize: 13,
                            fontWeight: isCorrectOpt || isSelected ? 600 : 400,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                          }}>
                            <span>{opt}</span>
                            {icon && <span style={{ fontWeight: 800 }}>{icon}</span>}
                          </div>
                        )
                      })}
                    </div>
                    {/* No answer case */}
                    {!studentAnswer && (
                      <div style={{ padding: '0 1rem 0.5rem', fontSize: 12, color: '#9ca3af' }}>No answer submitted</div>
                    )}
                  </div>
                )
              })}
            </div>

            {/* Footer */}
            <div style={{
              marginTop: '1.5rem',
              borderTop: '1px solid var(--border)',
              paddingTop: '0.75rem',
              fontSize: 11,
              color: '#9ca3af',
              display: 'flex',
              justifyContent: 'space-between',
            }}>
              <span>Generated by Academic Quiz Portal</span>
              <span>Weeks: {activeQuiz.weeks_range}</span>
            </div>
          </div>
        </div>
      )
    }

    // Main results list
    return (
      <div className="main stack">
        <div className="row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
          <button className="btn secondary small" onClick={() => setViewState('list')}>← Back to List</button>
          <div className="chip success">Live Results</div>
        </div>

        <div className="card stack">
          {/* Title */}
          <div className="row" style={{ gap: 8 }}>
            <div className="chip small mixed">{activeQuiz.class_name}</div>
            <div className="muted extra-small">• {activeQuiz.course_name}</div>
          </div>
          <h1 style={{ margin: '4px 0 0' }}>Student Results: Quiz #{activeQuiz.quiz_number}</h1>
          <div className="muted">Monitoring student performance in real-time.</div>

          {/* Filter tabs */}
          <div className="row" style={{ gap: 8, marginTop: '0.5rem' }}>
            {(['all', 'best', 'worst'] as const).map(f => (
              <button
                key={f}
                className={`btn small ${resultFilter === f ? '' : 'secondary'}`}
                style={{
                  textTransform: 'capitalize',
                  ...(f === 'best' && resultFilter === f ? { background: '#dcfce7', color: '#15803d', border: '1.5px solid #16a34a' } : {}),
                  ...(f === 'worst' && resultFilter === f ? { background: '#fee2e2', color: '#b91c1c', border: '1.5px solid #dc2626' } : {}),
                }}
                onClick={() => setResultFilter(f)}
              >
                {f === 'all' ? `All (${results.length})` : f === 'best' ? '🏆 Best' : '📉 Worst'}
              </button>
            ))}
          </div>

          {/* Summary strip for best/worst */}
          {resultFilter !== 'all' && displayedResults.length > 0 && (
            <div style={{
              background: resultFilter === 'best' ? '#f0fdf4' : '#fff5f5',
              border: `1.5px solid ${resultFilter === 'best' ? '#86efac' : '#fca5a5'}`,
              borderRadius: 10,
              padding: '0.75rem 1rem',
              fontSize: 13,
              color: resultFilter === 'best' ? '#15803d' : '#b91c1c',
              fontWeight: 600,
            }}>
              {resultFilter === 'best' ? '🏆 Top Performer' : '📉 Needs Attention'} — {displayedResults[0].student_name} scored {displayedResults[0].score}/{displayedResults[0].total} ({Math.round(displayedResults[0].score / displayedResults[0].total * 100)}%)
            </div>
          )}

          {/* Results grid */}
          <div className="grid3" style={{ marginTop: '0.5rem' }}>
            {displayedResults.map(r => {
              const pct = Math.round((r.score / r.total) * 100)
              const isBest = bestResult?.id === r.id
              const isWorst = worstResult?.id === r.id && results.length > 1
              return (
                <div key={r.id} className="card stack" style={{
                  background: 'var(--surface)',
                  border: isBest ? '2px solid #16a34a' : isWorst ? '2px solid #dc2626' : 'none',
                  padding: '1rem',
                  cursor: r.answers ? 'pointer' : 'default',
                  transition: 'box-shadow 0.15s',
                }}
                  onClick={() => r.answers && setDetailStudent(r)}
                  title={r.answers ? 'Click to view detailed answers' : ''}
                >
                  <div className="row" style={{ justifyContent: 'space-between' }}>
                    <div style={{ fontWeight: 700, color: 'var(--primary)', fontSize: '1.1rem' }}>{r.score} / {r.total}</div>
                    <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                      {isBest && <span style={{ fontSize: 10, background: '#dcfce7', color: '#15803d', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>🏆 BEST</span>}
                      {isWorst && <span style={{ fontSize: 10, background: '#fee2e2', color: '#b91c1c', padding: '2px 6px', borderRadius: 4, fontWeight: 700 }}>📉 WORST</span>}
                      <div className="chip human" style={{ fontSize: 10 }}>{pct}%</div>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontWeight: 600 }}>{r.student_name}</div>
                    <div className="muted small">Roll: {r.roll_no}</div>
                  </div>
                  {r.answers && (
                    <div style={{ fontSize: 11, color: 'var(--primary)', marginTop: 2 }}>View answers →</div>
                  )}
                </div>
              )
            })}
          </div>

          {results.length === 0 && (
            <div className="muted center" style={{ padding: '4rem' }}>No student submissions yet.</div>
          )}
        </div>
      </div>
    )
  }

  // ---------- PREVIEW VIEW ----------
  if (viewState === 'preview' && activeQuiz) {
    return (
      <div className="main stack">
        <div className="row" style={{ justifyContent: 'space-between' }}>
          <button className="btn secondary small" onClick={() => setViewState('list')}>← Back to List</button>
          <div className="chip mixed">Questions Preview</div>
        </div>
        <div className="card stack">
          <div className="row" style={{ gap: 8 }}>
            <div className="chip small mixed">{activeQuiz.class_name}</div>
            <div className="muted extra-small">• {activeQuiz.course_name}</div>
          </div>
          <h1>Quiz #{activeQuiz.quiz_number} Content</h1>
          <div className="stack" style={{ gap: 16, marginTop: '1.5rem' }}>
            {JSON.parse(activeQuiz.questions || '[]').map((q: any, idx: number) => (
              <div key={idx} className="card" style={{ background: 'var(--background)', border: '1.5px solid var(--border)' }}>
                <div style={{ fontWeight: 600, marginBottom: 8 }}>{idx + 1}. {q.text}</div>
                <div className="grid2" style={{ gap: 8 }}>
                  {q.options.map((opt: string, i: number) => (
                    <div key={i} className="small" style={{
                      padding: 8,
                      borderRadius: 6,
                      background: opt === q.correct ? 'var(--surface)' : 'white',
                      border: opt === q.correct ? '1px solid var(--primary)' : '1px solid var(--border)',
                      color: opt === q.correct ? 'var(--primary)' : 'inherit'
                    }}>
                      {opt} {opt === q.correct && '✓'}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  // ---------- SHARE VIEW ----------
  if (viewState === 'share' && activeQuiz) {
    return (
      <div className="main stack center" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div className="card stack" style={{ maxWidth: 500, width: '100%', borderTop: '4px solid var(--primary)' }}>
          <div className="brand" style={{ fontSize: '0.8rem' }}>QUIZ DISTRIBUTION PORTAL</div>
          <h2 style={{ margin: 0 }}>Quiz #{activeQuiz.quiz_number} Ready</h2>
          <div className="muted small">Share this secure link with your {activeQuiz.class_name} students.</div>

          <div className="stack" style={{ background: 'var(--background)', padding: 16, borderRadius: 12, border: '1px dashed var(--border)', marginTop: '1rem' }}>
            <div className="extra-small font-bold muted">SHAREABLE URL</div>
            <div style={{ wordBreak: 'break-all', fontWeight: 600, color: 'var(--primary)', margin: '8px 0' }}>{shareLink}</div>
            <button className="btn small" onClick={() => {
              navigator.clipboard.writeText(shareLink!);
              alert('Portal link copied!');
            }}>Copy Secure Link</button>
          </div>

          <button className="btn secondary" onClick={() => setViewState('list')} style={{ marginTop: '1rem' }}>Return to Dashboard</button>
        </div>
      </div>
    )
  }

  // ---------- DEFAULT LIST VIEW ----------
  return (
    <div className="main stack">
      <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center', borderBottom: '3px solid var(--surface)' }}>
        <div>
          <h1 style={{ margin: 0 }}>Academic Quizzes</h1>
          <div className="muted small">Manage assessments and track performance</div>
        </div>

        <div className="row" style={{ gap: 12 }}>
          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="extra-small">1. Select Class</label>
            <select value={selectedClassFilter} onChange={e => {
              setSelectedClassFilter(e.target.value);
              setSelectedCourseId(null);
            }}>
              <option value="">All Classes</option>
              {uniqueClasses.map(cls => <option key={cls} value={cls}>{cls}</option>)}
            </select>
          </div>

          <div className="form-group" style={{ minWidth: 200 }}>
            <label className="extra-small">2. Select Course</label>
            <select value={selectedCourseId ?? ''} onChange={e => setSelectedCourseId(Number(e.target.value))}>
              <option value="">Select Course...</option>
              {filteredCourses.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
          </div>
        </div>
      </div>

      {err && (
        <div className="card" style={{ borderLeft: '4px solid #d97706', background: '#fffbeb' }}>
          <div style={{ color: '#d97706', fontWeight: 600 }}>Sync Error</div>
          <div className="muted small">{err}</div>
        </div>
      )}

      <div className="card stack">
        {loading ? <div className="muted center" style={{ padding: '2rem' }}>Synchronizing quiz data...</div> : (
          <div className="stack" style={{ gap: 12 }}>
            {quizzes.map(q => (
              <div key={q.id} className="card row" style={{ justifyContent: 'space-between', padding: '1rem', background: 'white' }}>
                <div className="stack" style={{ gap: 4 }}>
                  <div className="row" style={{ gap: 8 }}>
                    <div className="chip small mixed" style={{ background: 'var(--surface)', color: 'var(--primary)' }}>{q.class_name}</div>
                    <div className="muted extra-small">{q.course_name}</div>
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '1.1rem' }}>Quiz #{q.quiz_number}</div>
                  <div className="muted small">Coverage: Weeks {q.weeks_range}</div>
                </div>
                <div className="row" style={{ gap: 12 }}>
                  <button className="btn ghost small" style={{ border: '1.5px solid var(--border)' }} onClick={() => onPreviewQuiz(q.id)}>Preview</button>
                  <button className="btn secondary small" onClick={() => onShare(q.id)}>Share</button>
                  <button className="btn small" onClick={() => onViewResults(q.id)}>Results</button>
                  <button className="btn danger small" style={{ background: '#fee2e2', border: 'none' }} onClick={() => onDeleteQuiz(q.id)}>Delete</button>
                </div>
              </div>
            ))}
            {!selectedCourseId && <div className="muted center" style={{ padding: '3rem' }}>Please select a Class and Course to view quizzes.</div>}
            {selectedCourseId && quizzes.length === 0 && <div className="muted center" style={{ padding: '3rem' }}>No quizzes generated for this course yet.</div>}
          </div>
        )}
      </div>
    </div>
  )
}

