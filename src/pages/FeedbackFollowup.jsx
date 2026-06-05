import { useEffect, useState } from 'react'
import { useSearchParams } from 'react-router-dom'

const COPY = {
  yes: {
    heading: 'Good to hear.',
    body: 'Thanks for checking in. Your feedback shapes the next version.',
  },
  no: {
    heading: 'Thanks for the honesty.',
    body: "That's useful. If you'd like to share more, reply to the email you received — Jon reads them.",
  },
  unsure: {
    heading: 'Fair enough.',
    body: 'These profiles sometimes take time to settle. No action needed.',
  },
}

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL

export default function FeedbackFollowup() {
  const [params] = useSearchParams()
  const token = params.get('token')
  const response = params.get('response')

  // Derive validity during render so the invalid state doesn't require a
  // synchronous setState inside the effect (react-hooks/set-state-in-effect).
  const isInvalid = !token || !response || !COPY[response]
  const [status, setStatus] = useState(() => (isInvalid ? 'invalid' : 'loading')) // loading | success | error | invalid

  useEffect(() => {
    if (isInvalid) return

    fetch(`${SUPABASE_URL}/functions/v1/record-followup-response`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token, response }),
    })
      .then(async (res) => {
        if (res.ok || res.status === 404) {
          // 404 = token not found / already used — still show thank-you (idempotent)
          setStatus('success')
        } else {
          console.error('[FeedbackFollowup] unexpected status', res.status)
          setStatus('error')
        }
      })
      .catch((err) => {
        console.error('[FeedbackFollowup] fetch error', err)
        setStatus('error')
      })
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  const copy = COPY[response]

  return (
    <div style={styles.page}>
      <div style={styles.card}>
        {status === 'loading' && <p style={styles.body}>One moment…</p>}

        {status === 'success' && copy && (
          <>
            <h1 style={styles.heading}>{copy.heading}</h1>
            <p style={styles.body}>{copy.body}</p>
          </>
        )}

        {(status === 'invalid' || status === 'error') && (
          <>
            <h1 style={styles.heading}>This link has expired or is invalid.</h1>
            <p style={styles.body}>If you think something went wrong, reply to the email you received.</p>
          </>
        )}
      </div>
    </div>
  )
}

const styles = {
  page: {
    minHeight: '100vh',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '2rem',
    backgroundColor: '#fafafa',
  },
  card: {
    maxWidth: '480px',
    width: '100%',
  },
  heading: {
    fontSize: '1.5rem',
    fontWeight: '600',
    marginBottom: '0.75rem',
    color: '#111',
  },
  body: {
    fontSize: '1rem',
    lineHeight: '1.6',
    color: '#444',
    margin: 0,
  },
}
