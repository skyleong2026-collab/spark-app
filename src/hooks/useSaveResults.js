import { supabase } from '../lib/supabase'
import { useAssessment } from '../context/AssessmentContext'

export function useSaveResults() {
  const {
    handResult,
    handType,
    handFrustrationTypes,
    heartType,
    heartResult,
    headType,
    headResult,
  } = useAssessment()

  async function saveResults() {
    if (sessionStorage.getItem('spark_results_saved') === 'true') return
    sessionStorage.setItem('spark_results_saved', 'true')

    // Use getSession() rather than useAuth()'s user — avoids the async
    // onAuthStateChange timing gap when called right after signInWithPassword.
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id
    if (!userId) return

    const frameworks = [
      { framework: 'hand', resultType: handType },
      { framework: 'heart', resultType: heartType },
      { framework: 'head', resultType: headType },
    ]

    for (const { framework, resultType } of frameworks) {
      if (!resultType) continue
      const { error } = await supabase.from('assessments').insert({
        user_id: userId,
        framework,
        result_type: resultType,
        completed_at: new Date().toISOString(),
      })
      if (error) console.error(`Assessment insert (${framework}):`, error)
    }

    // Claim anonymous hand_assessments row written during the assessment
    if (handResult?.session_id) {
      const { error: claimErr } = await supabase
        .from('hand_assessments')
        .update({ user_id: userId })
        .eq('session_id', handResult.session_id)
        .is('user_id', null)
      if (claimErr) console.error('Hand claim:', claimErr)
    }

    const profileData = { user_id: userId }
    if (handType) profileData.hand_type = handType
    if (handFrustrationTypes) profileData.hand_frustration_types = handFrustrationTypes
    if (heartType) profileData.heart_type = heartType
    if (heartResult?.final_confidence) profileData.heart_confidence = heartResult.final_confidence
    if (headType) profileData.head_type = headType
    if (headResult?.confidence) profileData.head_confidence = headResult.confidence
    if (headResult?.path) profileData.head_path = headResult.path

    // upsert is inherently idempotent via onConflict
    const { error: profileErr } = await supabase.from('profiles').upsert(
      profileData,
      { onConflict: 'user_id' }
    )
    if (profileErr) console.error('Profile upsert:', profileErr)

    if (headType && headResult) {
      const dominantStack = headResult.stack ?? ''
      const introvertedPrefixes = ['Ni', 'Ti', 'Fi', 'Si']
      const orientation = dominantStack
        ? (introvertedPrefixes.some(p => dominantStack.startsWith(p)) ? 'introverted' : 'extraverted')
        : null

      const { error: headInsertError } = await supabase
        .from('head_assessments')
        .insert({
          user_id: userId,
          path: headResult.path ?? 'A',
          result_type: headType,
          stack: dominantStack || null,
          orientation,
          confidence: headResult.confidence ?? null,
          ei_confidence: headResult.eiConfidence ?? null,
          secondary_stack: headResult.softSecondary ?? null,
          soft_secondary: headResult.softSecondary ?? null,
          stress_flag: false,
          raw_responses: null,
          confirmation_pair_fired: headResult?.confirmationPairsFired?.[0] ?? null,
          confirmation_pairs_fired: headResult?.confirmationPairsFired ?? null,
          confirmation_result: headResult?.confirmationResult ?? null,
          confirmation_user_stack: headResult?.confirmationUserStack ?? null,
        })
      if (headInsertError) console.error('head_assessments insert error:', headInsertError)
    }
  }

  return { saveResults }
}
