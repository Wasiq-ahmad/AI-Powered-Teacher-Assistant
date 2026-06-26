import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  AreaChart, Area, PieChart, Pie
} from 'recharts'
import { apiFetch } from '../lib/api'
import { useAuth } from '../state/auth'

type AnalyticsData = {
  class_performance: any[]
  activity_trends: any[]
  ai_distribution: any[]
  summary: {
    total_classes: number
    total_students_tracked: number
    active_assignments: number
  }
}

const COLORS = ['#4f46e5', '#10b981', '#f59e0b', '#ef4444']

export default function DashboardPage() {
  const { token } = useAuth()
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [loading, setLoading] = useState(true)

  async function loadDashboard() {
    try {
      const res = await apiFetch<AnalyticsData>('/analytics/dashboard', { token })
      setData(res)
    } catch { } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadDashboard()
  }, [])

  if (loading) return <div className="main center muted">Loading Platinum Dashboard...</div>

  return (
    <div className="stack" style={{ gap: '2rem' }}>
      <div className="card row" style={{ justifyContent: 'space-between', alignItems: 'center', background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)', color: 'white', border: 'none' }}>
        <div className="stack" style={{ gap: 4 }}>
          <h2 style={{ margin: 0, fontSize: '1.75rem' }}>Welcome Back, Professor</h2>
          <div style={{ opacity: 0.9 }}>Here is your academic overview for today.</div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid3">
        <div className="card stat-card">
          <div className="muted font-bold">Total Classes</div>
          <div className="stat-value">{data?.summary.total_classes || 0}</div>
          <div className="small muted">Active in current semester</div>
        </div>
        <div className="card stat-card">
          <div className="muted font-bold">Students Engaged</div>
          <div className="stat-value">{data?.summary.total_students_tracked || 0}</div>
          <div className="small muted">Across all quizzes & assignments</div>
        </div>
        <div className="card stat-card">
          <div className="muted font-bold">Submissions Analyzed</div>
          <div className="stat-value">{data?.summary.active_assignments || 0}</div>
          <div className="small muted">AI-Powered analysis complete</div>
        </div>
      </div>

      <div className="grid2">
        {/* Class Performance Chart */}
        <div className="card stack">
          <h3>Class Performance Index</h3>
          <div className="muted small">Average quiz scores (%) per class</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.class_performance || []}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="name" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                />
                <Bar dataKey="avg_score" fill="#4f46e5" radius={[4, 4, 0, 0]} barSize={40} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Activity Trends */}
        <div className="card stack">
          <h3>Activity Trends</h3>
          <div className="muted small">Quiz submissions over recent days</div>
          <div className="chart-container">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={data?.activity_trends || []}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.1} />
                    <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="date" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                <Area type="monotone" dataKey="count" stroke="#4f46e5" fillOpacity={1} fill="url(#colorCount)" strokeWidth={3} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="grid2" style={{ gridTemplateColumns: '1fr 300px' }}>
        <div className="card stack">
          <h3>Quick Links</h3>
          <div className="grid2">
            <Link to="/classes" className="card row" style={{ padding: 12, gap: 12 }}>
              <div style={{ background: '#eef2ff', padding: 8, borderRadius: 8 }}>📚</div>
              <div><b>Manage Classes</b><div className="small muted">View and edit class lists</div></div>
            </Link>
            <Link to="/courses" className="card row" style={{ padding: 12, gap: 12 }}>
              <div style={{ background: '#ecfdf5', padding: 8, borderRadius: 8 }}>📝</div>
              <div><b>Course Plans</b><div className="small muted">Generate AI course guides</div></div>
            </Link>
            <Link to="/quizzes" className="card row" style={{ padding: 12, gap: 12 }}>
              <div style={{ background: '#fff7ed', padding: 8, borderRadius: 8 }}>⚡</div>
              <div><b>Quiz Dashboard</b><div className="small muted">Review student results</div></div>
            </Link>
            <Link to="/assignments" className="card row" style={{ padding: 12, gap: 12 }}>
              <div style={{ background: '#f5f3ff', padding: 8, borderRadius: 8 }}>🤖</div>
              <div><b>AI Assignments</b><div className="small muted">Detect AI-generated text</div></div>
            </Link>
          </div>
        </div>

        {/* AI Distribution Pie */}
        <div className="card stack">
          <h3>Submission Integrity</h3>
          <div className="muted small">Assignment Origin Analysis</div>
          <div className="chart-container" style={{ height: 200 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={data?.ai_distribution.map((entry, index) => ({
                    ...entry,
                    fill: COLORS[index % COLORS.length]
                  })) || []}
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                />
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="stack" style={{ gap: 4 }}>
            {data?.ai_distribution.map((entry, index) => (
              <div key={index} className="row" style={{ justifyContent: 'space-between', fontSize: 12 }}>
                <div className="row" style={{ gap: 6 }}>
                  <div style={{ width: 8, height: 8, borderRadius: '50%', background: COLORS[index % COLORS.length] }} />
                  <span>{entry.name}</span>
                </div>
                <b>{entry.value}</b>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
