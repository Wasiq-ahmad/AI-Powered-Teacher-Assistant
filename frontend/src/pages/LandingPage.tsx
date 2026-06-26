import { Link } from 'react-router-dom'

const features = [
  {
    icon: '🧑‍🏫',
    title: 'Class Management',
    desc: 'Organize your students and classes effortlessly for targeted teaching.',
  },
  {
    icon: '🧠',
    title: 'AI-Powered Quizzes',
    desc: 'Generate intelligent quizzes instantly. Let AI handle grading and feedback.',
  },
  {
    icon: '📊',
    title: 'Analytics Dashboard',
    desc: 'Deep insights into student performance with data-driven reports.',
  },
]

export default function LandingPage() {
  return (
    <div className="landing">
      {/* HERO */}
      <section className="hero">
        <div className="hero-blob hero-blob-1" />
        <div className="hero-blob hero-blob-2" />
        <div className="hero-content">
          <div className="hero-badge">✨ Academic Platform for Professors</div>
          <h1 className="hero-title">
            Teach Smarter,<br />
            <span className="hero-gradient">Not Harder</span>
          </h1>
          <p className="hero-sub">
            Focus on teaching while we handle the rest. Generate AI quizzes, track performance, and manage your courses seamlessly.
          </p>
          <div className="hero-actions">
            <Link to="/register" className="btn btn-hero-primary">
              Get Started Free →
            </Link>
            <Link to="/login" className="btn btn-hero-secondary">
              Sign In
            </Link>
          </div>
        </div>
        <div className="hero-visual">
          <div className="dashboard-preview">
            <div className="preview-topbar">
              <div className="preview-dot r" /><div className="preview-dot y" /><div className="preview-dot g" />
              <span className="preview-url">teacher-assistant / dashboard</span>
            </div>
            <div className="preview-body">
              <div className="preview-stat-row">
                {['12 Classes', '8 Courses', '347 Students'].map(s => (
                  <div key={s} className="preview-stat">{s}</div>
                ))}
              </div>
              <div className="preview-chart-area">
                <div className="preview-bar" style={{ height: '60%' }} />
                <div className="preview-bar" style={{ height: '80%' }} />
                <div className="preview-bar" style={{ height: '50%' }} />
                <div className="preview-bar" style={{ height: '90%' }} />
                <div className="preview-bar" style={{ height: '70%' }} />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* QUICK FEATURES */}
      <section className="section features-section" style={{ padding: '0 2rem 4rem' }}>
        <div className="features-grid">
          {features.map(f => (
            <div key={f.title} className="feature-card" style={{ padding: '1.5rem', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
              <div className="feature-icon" style={{ fontSize: '2rem', marginBottom: '0.5rem' }}>{f.icon}</div>
              <h3 className="feature-title" style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>{f.title}</h3>
              <p className="feature-desc" style={{ fontSize: '0.9rem', margin: 0 }}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* FOOTER */}
      <footer className="landing-footer" style={{ marginTop: 'auto' }}>
        <div className="footer-brand">Teacher Assistant</div>
        <p className="footer-copy">© {new Date().getFullYear()} Teacher Assistant. Built for educators.</p>
      </footer>
    </div>
  )
}
