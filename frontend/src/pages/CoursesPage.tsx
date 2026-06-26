// import { useEffect, useState, type FormEvent } from 'react'
// import { apiFetch, downloadFile } from '../lib/api'
// import { useAuth } from '../state/auth'

// type SectionOut = {
//   id: number
//   name: string
// }

// type ClassOut = {
//   id: number
//   class_name: string
//   sections?: SectionOut[]
// }

// type CourseOut = {
//   id: number
//   name: string
//   outline: string
//   credit_hours: string
//   pdf_url?: string
//   class_name?: string
// }

// export default function CoursesPage() {
//   const { token } = useAuth()

//   const [courses, setCourses] = useState<CourseOut[]>([])
//   const [classes, setClasses] = useState<ClassOut[]>([])

//   const [loading, setLoading] = useState(false)
//   const [generating, setGenerating] = useState(false)
//   const [err, setErr] = useState<string | null>(null)

//   // form state
//   const [name, setName] = useState('')
//   const [courseCode, setCourseCode] = useState('') // ✅ FIX ADDED
//   const [classId, setClassId] = useState('')
//   const [sectionId, setSectionId] = useState('')
//   const [selectedClass, setSelectedClass] = useState<ClassOut | null>(null)

//   const [creditHours, setCreditHours] = useState('3-0')
//   const [outlineText, setOutlineText] = useState('')
//   const [outlineFile, setOutlineFile] = useState<File | null>(null)

//   async function loadData() {
//     setLoading(true)
//     setErr(null)

//     try {
//       const [cRes, clRes] = await Promise.all([
//         apiFetch<CourseOut[]>('/courses/my_courses', { token }),
//         apiFetch<any>('/academics/get_class', { token })
//       ])

//       setCourses(cRes)
//       setClasses(Array.isArray(clRes) ? clRes : [])
//     } catch (e: any) {
//       setErr(e?.message ?? 'Failed to load data')
//     } finally {
//       setLoading(false)
//     }
//   }

//   useEffect(() => {
//     loadData()
//   }, [])

//   function handleClassChange(id: string) {
//     setClassId(id)
//     setSectionId('')

//     const found = classes.find(c => c.id === Number(id))
//     setSelectedClass(found || null)

//     if (found?.sections?.length === 1) {
//       setSectionId(found.sections[0].id.toString())
//     }
//   }

//   async function onGenerate(e: FormEvent) {
//     e.preventDefault()
//     if (!classId) return

//     setGenerating(true)
//     setErr(null)

//     const formData = new FormData()

//     formData.append('name', name)
//     formData.append('course_code', courseCode) // ✅ FIX (THIS WAS MISSING)
//     formData.append('class_id', classId)
//     formData.append('credit_hours', creditHours)
//     formData.append('outline_text', outlineText)

//     if (sectionId) {
//       formData.append('section_id', sectionId)
//     }

//     if (outlineFile) {
//       formData.append('outline_file', outlineFile)
//     }

//     try {
//       await apiFetch('/courses/generate', {
//         method: 'POST',
//         token,
//         body: formData,
//       })

//       // reset
//       setName('')
//       setCourseCode('')
//       setOutlineText('')
//       setOutlineFile(null)
//       setSectionId('')

//       await loadData()
//     } catch (e: any) {
//       setErr(e?.message ?? 'Generation failed')
//     } finally {
//       setGenerating(false)
//     }
//   }

//   async function onDelete(id: number) {
//     if (!confirm('Delete this course?')) return

//     await apiFetch(`/courses/delete_course/${id}`, {
//       method: 'DELETE',
//       token
//     })

//     await loadData()
//   }

//   return (
//     <div className="stack">

//       {/* FORM CARD */}
//       <div className="card stack">
//         <h2 style={{ margin: 0 }}>Course Generator</h2>
//         <div className="muted">Create AI-powered course plan + quizzes</div>

//         <form className="stack" onSubmit={onGenerate}>

//           <div className="grid2">
//             <input
//               placeholder="Course Name"
//               value={name}
//               onChange={e => setName(e.target.value)}
//               required
//             />

//             <input
//               placeholder="Course Code (CS101)"
//               value={courseCode}
//               onChange={e => setCourseCode(e.target.value)}
//               required
//             />
//           </div>

//           <div className="grid2">
//             <select
//               value={classId}
//               onChange={e => handleClassChange(e.target.value)}
//               required
//             >
//               <option value="">Select Class</option>
//               {classes.map(c => (
//                 <option key={c.id} value={c.id}>
//                   {c.class_name}
//                 </option>
//               ))}
//             </select>

//             {selectedClass?.sections?.length ? (
//               <select
//                 value={sectionId}
//                 onChange={e => setSectionId(e.target.value)}
//               >
//                 <option value="">Section (Optional)</option>
//                 {selectedClass.sections.map(sec => (
//                   <option key={sec.id} value={sec.id}>
//                     {sec.name}
//                   </option>
//                 ))}
//               </select>
//             ) : (
//               <div className="muted">No sections available</div>
//             )}
//           </div>

//           <input
//             placeholder="Credit Hours (3-0)"
//             value={creditHours}
//             onChange={e => setCreditHours(e.target.value)}
//           />

//           <textarea
//             placeholder="Outline text..."
//             value={outlineText}
//             onChange={e => setOutlineText(e.target.value)}
//             style={{ minHeight: 100 }}
//           />

//           <input
//             type="file"
//             accept="application/pdf"
//             onChange={e => setOutlineFile(e.target.files?.[0] || null)}
//           />

//           <button className="btn" disabled={generating}>
//             {generating ? 'Generating...' : 'Generate Course'}
//           </button>

//           {err && <div className="error">{err}</div>}
//         </form>
//       </div>

//       {/* LIST CARD */}
//       <div className="card stack">
//         <h3>Your Courses</h3>

//         {loading ? (
//           <div className="muted">Loading...</div>
//         ) : (
//           <div className="stack">
//             {courses.map(c => (
//               <div
//                 key={c.id}
//                 className="row"
//                 style={{
//                   justifyContent: 'space-between',
//                   padding: '10px 0',
//                   borderBottom: '1px solid #eee'
//                 }}
//               >
//                 <div>
//                   <div style={{ fontWeight: 600 }}>{c.name}</div>
//                   <div className="muted small">
//                     {c.class_name} • {c.credit_hours}
//                   </div>
//                 </div>

//                 <div className="row" style={{ gap: 8 }}>
//                   {c.pdf_url && (
//                     <button
//                       className="btn secondary small"
//                       onClick={() =>
//                         downloadFile(c.pdf_url!, `${c.name}.pdf`, token)
//                       }
//                     >
//                       PDF
//                     </button>
//                   )}

//                   <button
//                     className="btn danger small"
//                     onClick={() => onDelete(c.id)}
//                   >
//                     Delete
//                   </button>
//                 </div>
//               </div>
//             ))}

//             {!loading && courses.length === 0 && (
//               <div className="muted">No courses yet</div>
//             )}
//           </div>
//         )}
//       </div>

//     </div>
//   )
// }


















import { useEffect, useState, type FormEvent } from 'react'
import { apiFetch, downloadFile } from '../lib/api'
import { useAuth } from '../state/auth'

type SectionOut = {
  id: number
  name: string
}

type ClassOut = {
  id: number
  class_name: string
  sections?: SectionOut[]
}

type CourseOut = {
  id: number
  name: string
  outline: string
  credit_hours: string
  pdf_url?: string
  class_name?: string
}

export default function CoursesPage() {
  const { token } = useAuth()

  const [courses, setCourses] = useState<CourseOut[]>([])
  const [classes, setClasses] = useState<ClassOut[]>([])

  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [err, setErr] = useState<string | null>(null)

  // =========================
  // 🔥 SEARCH STATE (ADDED)
  // =========================
  const [searchTerm, setSearchTerm] = useState('')

  // form state
  const [name, setName] = useState('')
  const [courseCode, setCourseCode] = useState('')
  const [classId, setClassId] = useState('')
  const [sectionId, setSectionId] = useState('')
  const [selectedClass, setSelectedClass] = useState<ClassOut | null>(null)

  const [creditHours, setCreditHours] = useState('3-0')
  const [outlineText, setOutlineText] = useState('')
  const [outlineFile, setOutlineFile] = useState<File | null>(null)

  async function loadData() {
    setLoading(true)
    setErr(null)

    try {
      const [cRes, clRes] = await Promise.all([
        apiFetch<CourseOut[]>('/courses/my_courses', { token }),
        apiFetch<any>('/academics/get_class', { token })
      ])

      setCourses(cRes)
      setClasses(Array.isArray(clRes) ? clRes : [])
    } catch (e: any) {
      setErr(e?.message ?? 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  function handleClassChange(id: string) {
    setClassId(id)
    setSectionId('')

    const found = classes.find(c => c.id === Number(id))
    setSelectedClass(found || null)

    if (found?.sections?.length === 1) {
      setSectionId(found.sections[0].id.toString())
    }
  }

  async function onGenerate(e: FormEvent) {
    e.preventDefault()
    if (!classId) return

    setGenerating(true)
    setErr(null)

    const formData = new FormData()

    formData.append('name', name)
    formData.append('course_code', courseCode)
    formData.append('class_id', classId)
    formData.append('credit_hours', creditHours)
    formData.append('outline_text', outlineText)

    if (sectionId) {
      formData.append('section_id', sectionId)
    }

    if (outlineFile) {
      formData.append('outline_file', outlineFile)
    }

    try {
      await apiFetch('/courses/generate', {
        method: 'POST',
        token,
        body: formData,
      })

      setName('')
      setCourseCode('')
      setOutlineText('')
      setOutlineFile(null)
      setSectionId('')

      await loadData()
    } catch (e: any) {
      setErr(e?.message ?? 'Generation failed')
    } finally {
      setGenerating(false)
    }
  }

  async function onDelete(id: number) {
    if (!confirm('Delete this course?')) return

    await apiFetch(`/courses/delete_course/${id}`, {
      method: 'DELETE',
      token
    })

    await loadData()
  }

  // =========================
  // 🔥 FILTERED COURSES (SEARCH ADDED)
  // =========================
  const filteredCourses = courses.filter(c =>
    c.class_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.name.toLowerCase().includes(searchTerm.toLowerCase())
  )

  return (
    <div className="stack">

      {/* FORM CARD */}
      <div className="card stack">
        <h2 style={{ margin: 0 }}>Course Generator</h2>

        <form className="stack" onSubmit={onGenerate}>

          <div className="grid2">
            <input
              placeholder="Course Name"
              value={name}
              onChange={e => setName(e.target.value)}
              required
            />

            <input
              placeholder="Course Code"
              value={courseCode}
              onChange={e => setCourseCode(e.target.value)}
              required
            />
          </div>

          <div className="grid2">
            <select
              value={classId}
              onChange={e => handleClassChange(e.target.value)}
              required
            >
              <option value="">Select Class</option>
              {classes.map(c => (
                <option key={c.id} value={c.id}>
                  {c.class_name}
                </option>
              ))}
            </select>

            {selectedClass?.sections?.length ? (
              <select
                value={sectionId}
                onChange={e => setSectionId(e.target.value)}
              >
                <option value="">Section (Optional)</option>
                {selectedClass.sections.map(sec => (
                  <option key={sec.id} value={sec.id}>
                    {sec.name}
                  </option>
                ))}
              </select>
            ) : (
              <div className="muted">No sections available</div>
            )}
          </div>

          <input
            placeholder="Credit Hours (3-0)"
            value={creditHours}
            onChange={e => setCreditHours(e.target.value)}
          />

          <textarea
            placeholder="Outline..."
            value={outlineText}
            onChange={e => setOutlineText(e.target.value)}
            style={{ minHeight: 100 }}
          />

          <input
            type="file"
            accept="application/pdf"
            onChange={e => setOutlineFile(e.target.files?.[0] || null)}
          />

          <button className="btn" disabled={generating}>
            {generating ? 'Generating...' : 'Generate Course'}
          </button>

          {err && <div className="error">{err}</div>}
        </form>
      </div>

      {/* LIST CARD */}
      <div className="card stack">
        <h3>Your Courses</h3>

        {/* =========================
            🔥 SEARCH BAR (ADDED)
        ========================= */}
        <input
          type="text"
          placeholder="Search by class name or course..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          style={{
            marginBottom: 12,
            padding: 10,
            borderRadius: 8,
            border: '1px solid #ddd'
          }}
        />

        {loading ? (
          <div className="muted">Loading...</div>
        ) : (
          <div className="stack">
            {filteredCourses.map(c => (
              <div
                key={c.id}
                className="row"
                style={{
                  justifyContent: 'space-between',
                  padding: '10px 0',
                  borderBottom: '1px solid #eee'
                }}
              >
                <div>
                  <div style={{ fontWeight: 600 }}>{c.name}</div>
                  <div className="muted small">
                    {c.class_name} • {c.credit_hours}
                  </div>
                </div>

                <div className="row" style={{ gap: 8 }}>
                  {c.pdf_url && (
                    <button
                      className="btn secondary small"
                      onClick={() =>
                        downloadFile(c.pdf_url!, `${c.name}.pdf`, token)
                      }
                    >
                      PDF
                    </button>
                  )}

                  <button
                    className="btn danger small"
                    onClick={() => onDelete(c.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            {!loading && filteredCourses.length === 0 && (
              <div className="muted">No matching courses found</div>
            )}
          </div>
        )}
      </div>

    </div>
  )
}