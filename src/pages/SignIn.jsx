import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { useAssessment } from '../context/AssessmentContext'
import { useSaveResults } from '../hooks/useSaveResults'

export default function SignIn() {
  const navigate = useNavigate()
  const { handResult, handType, heartType, heartResult, headType, headResult } = useAssessment()
  const [mode, setMode] = useState('signup') // signup | signin
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState(null)
  const [submitting, setSubmitting] = useState(false)

  const { saveResults } = useSaveResults()

  const hasResults = handType || handResult || heartType || heartResult || headType || headResult

  console.log('[SignIn] Context values on load:', { handType, heartType, headType, hasResults })

  async function handleSubmit(e) {
    e.preventDefault()
    setError(null)
    setSubmitting(true)

    try {
      if (mode === 'signup') {
        const { data, error: signUpErr } = await supabase.auth.signUp({ email, password })
        console.log('[SignIn] signUp response:', { user: data?.user?.id, session: !!data?.session, error: signUpErr })
        if (signUpErr) throw signUpErr

        if (data.session) {
          // Auto-confirmed — session is active
          console.log('[SignIn] Session active, saving results')
          await saveResults()
        } else if (data.user && !data.session) {
          // Email confirmation required
          setError('Check your email to confirm your account, then come back and sign in.')
          setSubmitting(false)
          return
        }
      } else {
        const { data, error: signInErr } = await supabase.auth.signInWithPassword({ email, password })
        console.log('[SignIn] signIn response:', { user: data?.user?.id, session: !!data?.session, error: signInErr })
        if (signInErr) throw signInErr
        if (data.user) {
          await saveResults()
        }
      }
      navigate('/results')
    } catch (err) {
      setError(err.message)
    } finally {
      setSubmitting(false)
    }
  }

  if (!hasResults) {
    return (
      <div style={page}>
        <div style={container}>
          <div style={card}>
            <div style={{ fontSize: 32, marginBottom: '1rem', textAlign: 'center' }}>✨</div>
            <h2 style={{ fontSize: 20, fontWeight: 600, color: '#1a1a18', marginBottom: '0.75rem', textAlign: 'center' }}>
              Take the free assessment first
            </h2>
            <p style={{ fontSize: 14, color: '#5f5e5a', lineHeight: 1.7, textAlign: 'center', marginBottom: '1.5rem' }}>
              It only takes 10 minutes — discover your SPARK profile, then create an account to save and unlock your full results.
            </p>
            <Link to="/assessment/hand" style={primaryBtn}>
              Start the assessment →
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div style={page}>
      <div style={container}>
        <div style={card}>
          <h2 style={{ fontSize: 22, fontWeight: 600, color: '#1a1a18', marginBottom: '0.25rem', textAlign: 'center' }}>
            {mode === 'signup' ? 'Create your account' : 'Welcome back'}
          </h2>
          <p style={{ fontSize: 14, color: '#5f5e5a', lineHeight: 1.6, textAlign: 'center', marginBottom: '1.5rem' }}>
            {mode === 'signup'
              ? 'Save your results and unlock your full SPARK synthesis.'
              : 'Sign in to access your SPARK profile.'
            }
          </p>

          {error && (
            <div style={errorBox}>{error}</div>
          )}

          <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
              style={input}
            />
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
              minLength={6}
              style={input}
            />
            <button type="submit" disabled={submitting} style={submitBtn}>
              {submitting
                ? 'Working...'
                : mode === 'signup' ? 'Create account' : 'Sign in'
              }
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '1.25rem', fontSize: 14, color: '#5f5e5a' }}>
            {mode === 'signup' ? (
              <>Already have an account?{' '}
                <button onClick={() => { setMode('signin'); setError(null) }} style={toggleBtn}>Sign in</button>
              </>
            ) : (
              <>Need an account?{' '}
                <button onClick={() => { setMode('signup'); setError(null) }} style={toggleBtn}>Sign up</button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

const page = {
  minHeight: '100vh',
  background: '#f5f5f3',
  padding: '4rem 1rem',
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
}

const container = {
  maxWidth: 420,
  width: '100%',
}

const card = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 12,
  padding: '2rem 1.5rem',
}

const input = {
  padding: '12px 14px',
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 8,
  fontSize: 15,
  fontFamily: 'inherit',
  outline: 'none',
  width: '100%',
  boxSizing: 'border-box',
}

const submitBtn = {
  padding: '12px 0',
  background: '#1a1a18',
  color: '#fff',
  border: 'none',
  borderRadius: 8,
  fontSize: 15,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
  marginTop: '0.25rem',
}

const primaryBtn = {
  display: 'block',
  textAlign: 'center',
  padding: '12px 20px',
  background: '#e6f1fb',
  color: '#185fa5',
  borderRadius: 8,
  fontSize: 14,
  fontWeight: 500,
  textDecoration: 'none',
}

const toggleBtn = {
  background: 'none',
  border: 'none',
  color: '#185fa5',
  cursor: 'pointer',
  fontSize: 14,
  fontWeight: 500,
  fontFamily: 'inherit',
  padding: 0,
  textDecoration: 'underline',
}

const errorBox = {
  padding: '10px 14px',
  background: '#fcebeb',
  color: '#a32d2d',
  borderRadius: 8,
  fontSize: 13,
  lineHeight: 1.5,
  marginBottom: '0.75rem',
}
