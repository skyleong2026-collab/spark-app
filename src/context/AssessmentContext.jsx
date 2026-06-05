import { createContext, useContext, useState, useCallback } from 'react'

const AssessmentContext = createContext(null)

function isFreshStart() {
  try { return sessionStorage.getItem('spark_fresh_start') === 'true' } catch { return false }
}

function loadStored(key) {
  try {
    if (isFreshStart()) return null
    return localStorage.getItem(key)
  } catch { return null }
}

function loadStoredJSON(key) {
  try {
    if (isFreshStart()) return null
    const v = localStorage.getItem(key)
    return v ? JSON.parse(v) : null
  } catch { return null }
}

function store(key, value) {
  try {
    if (value != null) localStorage.setItem(key, typeof value === 'string' ? value : JSON.stringify(value))
    else localStorage.removeItem(key)
  } catch { /* localStorage unavailable — non-fatal */ }
}

const KEYS = [
  'spark_hand', 'spark_hand_geniuses', 'spark_hand_frustrations', 'spark_hand_result',
  'spark_heart', 'spark_heart_result',
  'spark_head', 'spark_head_result',
]

export function AssessmentProvider({ children }) {
  // Heart
  const [heartType, _setHeartType] = useState(() => loadStored('spark_heart'))
  const [heartResult, _setHeartResult] = useState(() => loadStoredJSON('spark_heart_result'))

  // Head
  const [headType, _setHeadType] = useState(() => loadStored('spark_head'))
  const [headResult, _setHeadResult] = useState(() => loadStoredJSON('spark_head_result'))

  // Hand
  const [handResult, _setHandResult] = useState(() => loadStoredJSON('spark_hand_result'))
  /** @deprecated Use handResult instead. Kept for v1 backward compatibility. */
  const [handType, _setHandType] = useState(() => loadStored('spark_hand'))
  /** @deprecated Use handResult instead. Kept for v1 backward compatibility. */
  const [handGeniusTypes, _setHandGeniusTypes] = useState(() => loadStoredJSON('spark_hand_geniuses'))
  /** @deprecated Use handResult instead. Kept for v1 backward compatibility. */
  const [handFrustrationTypes, _setHandFrustrationTypes] = useState(() => loadStoredJSON('spark_hand_frustrations'))

  const setHeartType = useCallback((v) => { _setHeartType(v); store('spark_heart', v) }, [])
  const setHeartResult = useCallback((v) => { _setHeartResult(v); store('spark_heart_result', v) }, [])
  const setHeadType = useCallback((v) => { _setHeadType(v); store('spark_head', v) }, [])
  const setHeadResult = useCallback((v) => { _setHeadResult(v); store('spark_head_result', v) }, [])
  const setHandResult = useCallback((v) => { _setHandResult(v); store('spark_hand_result', v) }, [])
  /** @deprecated Use setHandResult instead. */
  const setHandType = useCallback((v) => { _setHandType(v); store('spark_hand', v) }, [])
  /** @deprecated Use setHandResult instead. */
  const setHandGeniusTypes = useCallback((v) => { _setHandGeniusTypes(v); store('spark_hand_geniuses', v) }, [])
  /** @deprecated Use setHandResult instead. */
  const setHandFrustrationTypes = useCallback((v) => { _setHandFrustrationTypes(v); store('spark_hand_frustrations', v) }, [])

  const clearAll = useCallback(() => {
    try { KEYS.forEach(k => localStorage.removeItem(k)) } catch { /* ignore */ }
    try { sessionStorage.setItem('spark_fresh_start', 'true') } catch { /* ignore */ }
    _setHeartType(null); _setHeartResult(null)
    _setHeadType(null); _setHeadResult(null)
    _setHandResult(null); _setHandType(null); _setHandGeniusTypes(null); _setHandFrustrationTypes(null)
  }, [])

  const checkFreshComplete = useCallback(() => {
    try {
      if (sessionStorage.getItem('spark_fresh_start') === 'true') {
        if ((localStorage.getItem('spark_hand') || localStorage.getItem('spark_hand_result')) && localStorage.getItem('spark_heart') && localStorage.getItem('spark_head')) {
          sessionStorage.removeItem('spark_fresh_start')
        }
      }
    } catch { /* sessionStorage unavailable — non-fatal */ }
  }, [])

  const setHeartTypeW = useCallback((v) => { setHeartType(v); checkFreshComplete() }, [setHeartType, checkFreshComplete])
  const setHeadTypeW = useCallback((v) => { setHeadType(v); checkFreshComplete() }, [setHeadType, checkFreshComplete])
  const setHandTypeW = useCallback((v) => { setHandType(v); checkFreshComplete() }, [setHandType, checkFreshComplete])
  const setHandResultW = useCallback((v) => { setHandResult(v); checkFreshComplete() }, [setHandResult, checkFreshComplete])

  return (
    <AssessmentContext.Provider value={{
      heartType, setHeartType: setHeartTypeW, heartResult, setHeartResult,
      headType, setHeadType: setHeadTypeW, headResult, setHeadResult,
      handResult, setHandResult: setHandResultW,
      handType, setHandType: setHandTypeW, handGeniusTypes, setHandGeniusTypes, handFrustrationTypes, setHandFrustrationTypes,
      clearAll,
    }}>
      {children}
    </AssessmentContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components -- hook co-located with its provider by design
export function useAssessment() {
  const ctx = useContext(AssessmentContext)
  if (!ctx) throw new Error('useAssessment must be used within AssessmentProvider')
  return ctx
}
