import { useState, useEffect, useMemo } from 'react'
import { supabase } from '../../lib/supabase'

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso) {
  if (!iso) return '—'
  const d = new Date(iso)
  const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']
  const h = d.getHours()
  const m = String(d.getMinutes()).padStart(2, '0')
  const ampm = h >= 12 ? 'pm' : 'am'
  const h12 = h % 12 || 12
  return `${months[d.getMonth()]} ${d.getDate()}, ${h12}:${m} ${ampm}`
}

function stars(val) {
  if (val == null) return '—'
  const n = Math.round(Number(val))
  return '★'.repeat(Math.max(0, n)) + '☆'.repeat(Math.max(0, 5 - n))
}

function ThumbDot({ value }) {
  const color = value === true ? '#22c55e' : value === false ? '#ef4444' : '#d1d5db'
  return (
    <span style={{
      display: 'inline-block',
      width: 8,
      height: 8,
      borderRadius: '50%',
      background: color,
      margin: '0 2px',
    }} />
  )
}

function copyText(text) {
  navigator.clipboard.writeText(text).catch(() => {})
}

// ─── component ────────────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const [kpis, setKpis] = useState(null)
  const [rows, setRows] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // filters
  const [heartFilter, setHeartFilter] = useState('All')
  const [headFilter, setHeadFilter] = useState('All')
  const [confFilter, setConfFilter] = useState('All')
  const [flaggedOnly, setFlaggedOnly] = useState(false)
  const [openTextOnly, setOpenTextOnly] = useState(false)

  // sort
  const [sortCol, setSortCol] = useState('created_at')
  const [sortDir, setSortDir] = useState('desc')

  // expand
  const [expandedId, setExpandedId] = useState(null)
  const [expandedOpenText, setExpandedOpenText] = useState(new Set())

  async function fetchData() {
    setLoading(true)
    setError(null)
    try {
      const [kpiRes, feedbackRes] = await Promise.all([
        supabase.from('spark_beta_kpis').select('*').single(),
        supabase.from('spark_feedback_summary').select('*').order('created_at', { ascending: false }).limit(200),
      ])
      if (kpiRes.error && kpiRes.error.code !== 'PGRST116') throw kpiRes.error
      if (feedbackRes.error) throw feedbackRes.error
      setKpis(kpiRes.data || null)
      setRows(feedbackRes.data || [])
    } catch (err) {
      setError(err.message || 'Failed to load data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchData() }, [])

  // derived: unique head stacks from rows
  const headStacks = useMemo(() => {
    const seen = new Set()
    rows.forEach(r => { if (r.head_stack) seen.add(r.head_stack) })
    return ['All', ...Array.from(seen).sort()]
  }, [rows])

  const heartTypes = useMemo(() => {
    const seen = new Set()
    rows.forEach(r => { if (r.heart_type != null) seen.add(String(r.heart_type)) })
    return ['All', ...Array.from(seen).sort((a, b) => Number(a) - Number(b))]
  }, [rows])

  // filtered rows
  const filteredRows = useMemo(() => {
    let out = rows
    if (heartFilter !== 'All') out = out.filter(r => String(r.heart_type) === heartFilter)
    if (headFilter !== 'All') out = out.filter(r => r.head_stack === headFilter)
    if (confFilter !== 'All') out = out.filter(r => r.heart_confidence === confFilter)
    if (flaggedOnly) out = out.filter(r => r.flagged_for_review)
    if (openTextOnly) out = out.filter(r => r.q_open_text)
    return out
  }, [rows, heartFilter, headFilter, confFilter, flaggedOnly, openTextOnly])

  // sorted rows
  const sortedRows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1
    return [...filteredRows].sort((a, b) => {
      const va = a[sortCol]
      const vb = b[sortCol]
      if (va == null && vb == null) return 0
      if (va == null) return 1
      if (vb == null) return -1
      return va < vb ? -dir : va > vb ? dir : 0
    })
  }, [filteredRows, sortCol, sortDir])

  function handleSort(col) {
    if (sortCol === col) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    } else {
      setSortCol(col)
      setSortDir('desc')
    }
  }

  function sortIcon(col) {
    if (sortCol !== col) return ' ↕'
    return sortDir === 'asc' ? ' ↑' : ' ↓'
  }

  async function toggleFlag(row) {
    const next = !row.flagged_for_review
    // optimistic update
    setRows(prev => prev.map(r => r.id === row.id ? { ...r, flagged_for_review: next } : r))
    const { error: err } = await supabase
      .from('spark_beta_feedback')
      .update({ flagged_for_review: next })
      .eq('id', row.id)
    if (err) {
      // revert
      setRows(prev => prev.map(r => r.id === row.id ? { ...r, flagged_for_review: row.flagged_for_review } : r))
    }
  }

  function toggleExpand(id) {
    setExpandedId(prev => prev === id ? null : id)
  }

  function toggleOpenText(id) {
    setExpandedOpenText(prev => {
      const next = new Set(prev)
      next.has(id) ? next.delete(id) : next.add(id)
      return next
    })
  }

  // ── KPI colors ──────────────────────────────────────────────────────────────

  function kpiCardColor(type, value) {
    if (type === 'recognizable') {
      const pct = Number(value)
      if (pct >= 85) return { border: '1px solid #86efac', background: '#f0fdf4' }
      if (pct >= 60) return { border: '1px solid #fde68a', background: '#fffbeb' }
      return { border: '1px solid #fca5a5', background: '#fef2f2' }
    }
    if (type === 'banned') {
      const pct = Number(value)
      if (pct === 0) return { border: '1px solid #86efac', background: '#f0fdf4' }
      if (pct <= 2) return { border: '1px solid #fde68a', background: '#fffbeb' }
      return { border: '1px solid #fca5a5', background: '#fef2f2' }
    }
    return { border: '1px solid rgba(0,0,0,0.08)', background: '#fff' }
  }

  // ── render ──────────────────────────────────────────────────────────────────

  if (loading) {
    return (
      <div style={{ ...page, alignItems: 'center', justifyContent: 'center' }}>
        <p style={{ color: '#5f5e5a', fontSize: 15 }}>Loading…</p>
      </div>
    )
  }

  if (error) {
    return (
      <div style={{ ...page, alignItems: 'center', justifyContent: 'center' }}>
        <div style={errorBox}>
          <p style={{ margin: '0 0 0.75rem', fontWeight: 500 }}>Failed to load dashboard</p>
          <p style={{ margin: '0 0 1rem', fontSize: 13, color: '#a32d2d' }}>{error}</p>
          <button onClick={fetchData} style={retryBtn}>Retry</button>
        </div>
      </div>
    )
  }

  const recognizablePct = kpis?.pct_recognizable != null ? Number(kpis.pct_recognizable).toFixed(1) : null
  const bannedPct = kpis?.banned_word_pct != null ? Number(kpis.banned_word_pct).toFixed(1) : null

  const openTextRows = filteredRows.filter(r => r.q_open_text)

  return (
    <div style={page}>
      <div style={inner}>

        {/* Header */}
        <div style={{ marginBottom: '2rem' }}>
          <h1 style={{ fontSize: 22, fontWeight: 700, color: '#1a1a18', margin: 0 }}>SPARK Admin</h1>
          <p style={{ fontSize: 13, color: '#5f5e5a', margin: '0.25rem 0 0' }}>Beta feedback dashboard</p>
        </div>

        {/* ── KPI strip ──────────────────────────────────────────────────── */}
        <div style={kpiGrid}>
          <div style={kpiCard()}>
            <div style={kpiLabel}>Total responses</div>
            <div style={kpiValue}>{kpis?.total_responses ?? 0}</div>
          </div>

          <div style={kpiCard(kpiCardColor('recognizable', recognizablePct))}>
            <div style={kpiLabel}>% Recognizable</div>
            <div style={kpiValue}>{recognizablePct != null ? `${recognizablePct}%` : '—'}</div>
            <div style={kpiTarget}>target: 85–90%</div>
          </div>

          <div style={kpiCard()}>
            <div style={kpiLabel}>Avg satisfaction</div>
            <div style={kpiValue}>
              {kpis?.avg_satisfaction != null ? `${Number(kpis.avg_satisfaction).toFixed(1)} / 5` : '—'}
            </div>
          </div>

          <div style={kpiCard(kpiCardColor('banned', bannedPct))}>
            <div style={kpiLabel}>Banned word hits</div>
            <div style={kpiValue}>
              {kpis?.banned_word_hits ?? 0}
              {bannedPct != null && <span style={{ fontSize: 13, fontWeight: 400, marginLeft: 6 }}>({bannedPct}%)</span>}
            </div>
            <div style={kpiTarget}>target: &lt;2%</div>
          </div>
        </div>

        {/* ── Filter bar ─────────────────────────────────────────────────── */}
        <div style={filterBar}>
          <label style={filterLabel}>
            Heart
            <select style={filterSelect} value={heartFilter} onChange={e => setHeartFilter(e.target.value)}>
              {heartTypes.map(v => <option key={v}>{v}</option>)}
            </select>
          </label>

          <label style={filterLabel}>
            Head stack
            <select style={filterSelect} value={headFilter} onChange={e => setHeadFilter(e.target.value)}>
              {headStacks.map(v => <option key={v}>{v}</option>)}
            </select>
          </label>

          <label style={filterLabel}>
            Confidence
            <select style={filterSelect} value={confFilter} onChange={e => setConfFilter(e.target.value)}>
              {['All', 'High', 'Moderate', 'Low'].map(v => <option key={v}>{v}</option>)}
            </select>
          </label>

          <label style={checkLabel}>
            <input type="checkbox" checked={flaggedOnly} onChange={e => setFlaggedOnly(e.target.checked)} />
            {' '}Flagged only
          </label>

          <label style={checkLabel}>
            <input type="checkbox" checked={openTextOnly} onChange={e => setOpenTextOnly(e.target.checked)} />
            {' '}Open text only
          </label>

          <span style={{ marginLeft: 'auto', fontSize: 13, color: '#5f5e5a', whiteSpace: 'nowrap' }}>
            {filteredRows.length} of {rows.length}
          </span>
        </div>

        {/* ── Response table ─────────────────────────────────────────────── */}
        {filteredRows.length === 0 ? (
          <div style={emptyState}>No responses yet — check back after beta opens.</div>
        ) : (
          <div style={{ overflowX: 'auto', marginBottom: '2.5rem' }}>
            <table style={table}>
              <thead>
                <tr>
                  <Th onClick={() => handleSort('created_at')}>Date{sortIcon('created_at')}</Th>
                  <Th onClick={() => handleSort('heart_type')}>Heart{sortIcon('heart_type')}</Th>
                  <Th>Head</Th>
                  <Th>Hand</Th>
                  <Th>Conf</Th>
                  <Th onClick={() => handleSort('avg_satisfaction')}>Sat{sortIcon('avg_satisfaction')}</Th>
                  <Th>👍/👎</Th>
                  <Th>Retake?</Th>
                  <Th>Email</Th>
                  <Th>Flag</Th>
                  <Th>Open text</Th>
                </tr>
              </thead>
              <tbody>
                {sortedRows.map(row => {
                  const isExpanded = expandedId === row.id
                  const openTextExp = expandedOpenText.has(row.id)
                  const openText = row.q_open_text || null

                  return [
                    <tr
                      key={row.id}
                      onClick={() => toggleExpand(row.id)}
                      style={{ ...tr, background: isExpanded ? '#f0f4ff' : undefined, cursor: 'pointer' }}
                    >
                      <Td style={{ whiteSpace: 'nowrap', color: '#5f5e5a', fontSize: 12 }}>
                        {formatDate(row.created_at)}
                      </Td>
                      <Td>{row.heart_type ?? '—'}</Td>
                      <Td style={{ whiteSpace: 'nowrap' }}>{row.head_stack ?? '—'}</Td>
                      <Td style={{ whiteSpace: 'nowrap' }}>{row.hand_energy ?? '—'}</Td>
                      <Td style={{ whiteSpace: 'nowrap', fontSize: 12 }}>
                        {confBadge(row.heart_confidence)} / {confBadge(row.head_confidence)}
                      </Td>
                      <Td style={{ whiteSpace: 'nowrap', fontSize: 13 }}>
                        {row.avg_satisfaction != null
                          ? `${Number(row.avg_satisfaction).toFixed(1)} / 5`
                          : '—'}
                      </Td>
                      <Td style={{ whiteSpace: 'nowrap' }}>
                        <ThumbDot value={row.thumb_core_motivation} />
                        <ThumbDot value={row.thumb_processing} />
                        <ThumbDot value={row.thumb_contribution_drain} />
                        <ThumbDot value={row.thumb_intersection} />
                      </Td>
                      <Td style={{ textAlign: 'center' }}>
                        {row.retake_eligible ? '↩' : ''}
                      </Td>
                      <Td style={{ textAlign: 'center' }}>
                        {row.followup_email_sent ? '✓' : '–'}
                      </Td>
                      <Td style={{ textAlign: 'center' }} onClick={e => { e.stopPropagation(); toggleFlag(row) }}>
                        <span style={{
                          cursor: 'pointer',
                          opacity: row.flagged_for_review ? 1 : 0.25,
                          fontSize: 15,
                          userSelect: 'none',
                        }}>🚩</span>
                      </Td>
                      <Td style={{ maxWidth: 200 }}>
                        {openText ? (
                          <span
                            onClick={e => { e.stopPropagation(); toggleOpenText(row.id) }}
                            style={{ cursor: 'pointer', fontSize: 12, color: '#374151' }}
                          >
                            {openTextExp
                              ? openText
                              : openText.length > 60
                                ? openText.slice(0, 60) + '…'
                                : openText}
                          </span>
                        ) : (
                          <span style={{ fontSize: 12, color: '#9ca3af', fontStyle: 'italic' }}>—</span>
                        )}
                      </Td>
                    </tr>,

                    isExpanded && (
                      <tr key={`${row.id}-detail`}>
                        <td colSpan={11} style={detailCell}>
                          <div style={detailGrid}>
                            <div>
                              <DetailSection label="Open text">
                                {row.q_open_text
                                  ? <p style={{ margin: 0, fontSize: 13, lineHeight: 1.6 }}>{row.q_open_text}</p>
                                  : <Muted>—</Muted>}
                              </DetailSection>

                              <DetailSection label="Q scores">
                                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                                  {[['Q1', row.q_recognition], ['Q2', row.q_resonance], ['Q3', row.q_tension_accuracy], ['Q4', row.q_language_fit]].map(([label, val]) => (
                                    <span key={label} style={{ fontSize: 13 }}>
                                      <strong>{label}:</strong> {val ?? '—'}
                                    </span>
                                  ))}
                                </div>
                              </DetailSection>

                              <DetailSection label="Section thumbs">
                                <div style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap' }}>
                                  {[['CM', row.thumb_core_motivation], ['PA', row.thumb_processing], ['CD', row.thumb_contribution_drain], ['IX', row.thumb_intersection]].map(([label, val]) => (
                                    <span key={label} style={{ fontSize: 13, display: 'flex', alignItems: 'center', gap: 4 }}>
                                      <strong>{label}</strong>
                                      <ThumbDot value={val} />
                                    </span>
                                  ))}
                                </div>
                              </DetailSection>
                            </div>

                            <div>
                              <DetailSection label="Flags">
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: 13 }}>
                                  <span>High conf / low sat: <strong>{row.high_conf_low_sat ? 'Yes' : 'No'}</strong></span>
                                  <span>Exemplar version: <strong>{row.exemplar_version ?? '—'}</strong></span>
                                </div>
                              </DetailSection>

                              <DetailSection label="Assessment ID">
                                <span
                                  style={{ fontSize: 12, color: '#374151', cursor: 'pointer', textDecoration: 'underline dotted' }}
                                  onClick={() => copyText(row.assessment_id ?? '')}
                                  title="Click to copy"
                                >
                                  {row.assessment_id ?? '—'}
                                </span>
                              </DetailSection>
                            </div>
                          </div>
                        </td>
                      </tr>
                    ),
                  ]
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Open text panel ────────────────────────────────────────────── */}
        {openTextRows.length > 0 && (
          <div style={{ marginBottom: '3rem' }}>
            <h2 style={sectionHeading}>What people wrote</h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              {openTextRows.map(row => (
                <div key={row.id} style={openTextCard}>
                  <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                    <span style={badge}>Heart {row.heart_type ?? '—'}</span>
                    {row.head_stack && <span style={badge}>{row.head_stack}</span>}
                    {row.hand_energy && <span style={badge}>{row.hand_energy}</span>}
                    {row.avg_satisfaction != null && (
                      <span style={{ fontSize: 13, color: '#d97706' }}>{stars(row.avg_satisfaction)}</span>
                    )}
                  </div>
                  <p style={{ margin: 0, fontSize: 14, color: '#1a1a18', lineHeight: 1.7 }}>{row.q_open_text}</p>
                </div>
              ))}
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

// ─── small render helpers ─────────────────────────────────────────────────────

function Th({ children, onClick, style }) {
  return (
    <th
      onClick={onClick}
      style={{
        padding: '10px 12px',
        textAlign: 'left',
        fontSize: 12,
        fontWeight: 600,
        color: '#6b7280',
        background: '#f9fafb',
        borderBottom: '1px solid #e5e7eb',
        whiteSpace: 'nowrap',
        cursor: onClick ? 'pointer' : 'default',
        userSelect: 'none',
        ...style,
      }}
    >
      {children}
    </th>
  )
}

function Td({ children, style, onClick }) {
  return (
    <td
      onClick={onClick}
      style={{
        padding: '10px 12px',
        fontSize: 13,
        color: '#1a1a18',
        borderBottom: '1px solid #f3f4f6',
        verticalAlign: 'top',
        ...style,
      }}
    >
      {children}
    </td>
  )
}

function DetailSection({ label, children }) {
  return (
    <div style={{ marginBottom: '1rem' }}>
      <div style={{ fontSize: 11, fontWeight: 600, color: '#6b7280', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.35rem' }}>
        {label}
      </div>
      {children}
    </div>
  )
}

function Muted({ children }) {
  return <span style={{ fontSize: 13, color: '#9ca3af', fontStyle: 'italic' }}>{children}</span>
}

function confBadge(val) {
  if (!val) return '—'
  const map = { High: 'H', Moderate: 'M', Low: 'L' }
  return map[val] ?? val
}

// ─── styles ───────────────────────────────────────────────────────────────────

const page = {
  minHeight: '100vh',
  background: '#f5f5f3',
  padding: '2rem 1rem',
}

const inner = {
  maxWidth: 1200,
  margin: '0 auto',
}

const kpiGrid = {
  display: 'grid',
  gridTemplateColumns: 'repeat(4, 1fr)',
  gap: '1rem',
  marginBottom: '1.5rem',
}

function kpiCard(extra = {}) {
  return {
    background: '#fff',
    border: '1px solid rgba(0,0,0,0.08)',
    borderRadius: 10,
    padding: '1.25rem',
    ...extra,
  }
}

const kpiLabel = {
  fontSize: 12,
  color: '#6b7280',
  fontWeight: 500,
  marginBottom: '0.5rem',
}

const kpiValue = {
  fontSize: 26,
  fontWeight: 700,
  color: '#1a1a18',
  lineHeight: 1.1,
}

const kpiTarget = {
  fontSize: 11,
  color: '#9ca3af',
  marginTop: '0.35rem',
}

const filterBar = {
  display: 'flex',
  alignItems: 'center',
  flexWrap: 'wrap',
  gap: '0.75rem',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 8,
  padding: '0.875rem 1rem',
  marginBottom: '1rem',
}

const filterLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.4rem',
  fontSize: 13,
  color: '#374151',
  fontWeight: 500,
}

const filterSelect = {
  fontSize: 13,
  border: '1px solid rgba(0,0,0,0.15)',
  borderRadius: 6,
  padding: '4px 8px',
  fontFamily: 'inherit',
  background: '#fff',
  color: '#1a1a18',
}

const checkLabel = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.35rem',
  fontSize: 13,
  color: '#374151',
  cursor: 'pointer',
  userSelect: 'none',
}

const table = {
  width: '100%',
  borderCollapse: 'collapse',
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 10,
  overflow: 'hidden',
  fontSize: 13,
}

const tr = {
  transition: 'background 0.1s',
}

const detailCell = {
  padding: '1rem 1.5rem 1.25rem',
  background: '#f0f4ff',
  borderBottom: '1px solid #e5e7eb',
}

const detailGrid = {
  display: 'grid',
  gridTemplateColumns: '1fr 1fr',
  gap: '1rem 2rem',
}

const emptyState = {
  padding: '2.5rem',
  textAlign: 'center',
  fontSize: 14,
  color: '#6b7280',
  background: '#fff',
  borderRadius: 10,
  border: '1px solid rgba(0,0,0,0.08)',
  marginBottom: '2rem',
}

const errorBox = {
  background: '#fff',
  border: '1px solid #fca5a5',
  borderRadius: 10,
  padding: '2rem',
  textAlign: 'center',
  maxWidth: 400,
  color: '#a32d2d',
}

const retryBtn = {
  padding: '9px 20px',
  background: '#1a1a18',
  color: '#fff',
  border: 'none',
  borderRadius: 7,
  fontSize: 14,
  fontWeight: 500,
  cursor: 'pointer',
  fontFamily: 'inherit',
}

const sectionHeading = {
  fontSize: 16,
  fontWeight: 600,
  color: '#1a1a18',
  margin: '0 0 1rem',
}

const openTextCard = {
  background: '#fff',
  border: '1px solid rgba(0,0,0,0.08)',
  borderRadius: 10,
  padding: '1rem 1.25rem',
}

const badge = {
  fontSize: 12,
  fontWeight: 500,
  background: '#f3f4f6',
  color: '#374151',
  borderRadius: 5,
  padding: '2px 8px',
}
