import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"
import { corsHeaders } from "../_shared/cors.ts"

const supabaseAdmin = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
)

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY")
const FROM_EMAIL    = Deno.env.get("RESEND_FROM_EMAIL") ?? "noreply@sparkassessment.com"
const SITE_URL      = Deno.env.get("SITE_URL")          ?? "https://sparkassessment.com"

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders })
  }

  if (!RESEND_API_KEY) {
    console.warn("[send-followup-emails] RESEND_API_KEY is not set — skipping all sends")
    return new Response(JSON.stringify({ skipped: true, reason: "RESEND_API_KEY not configured" }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  // Rows older than 48h that haven't had a follow-up email sent yet
  const cutoff = new Date(Date.now() - 48 * 60 * 60 * 1000).toISOString()

  const { data: rows, error: queryError } = await supabaseAdmin
    .from("spark_beta_feedback")
    .select("id, user_id, followup_response_token")
    .eq("followup_email_sent", false)
    .lt("created_at", cutoff)
    .limit(50)

  if (queryError) {
    console.error("[send-followup-emails] query error:", queryError.message)
    return new Response(JSON.stringify({ error: queryError.message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  if (!rows || rows.length === 0) {
    return new Response(JSON.stringify({ sent: 0 }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    })
  }

  let sent = 0
  let failed = 0

  for (const row of rows) {
    if (!row.user_id) {
      // Anonymous row — mark as sent so we don't retry forever
      await supabaseAdmin
        .from("spark_beta_feedback")
        .update({ followup_email_sent: true, followup_sent_at: new Date().toISOString() })
        .eq("id", row.id)
      continue
    }

    // Look up the user's email via the admin auth API
    const { data: authUser, error: userError } = await supabaseAdmin.auth.admin.getUserById(row.user_id)
    if (userError || !authUser?.user?.email) {
      console.warn(`[send-followup-emails] could not get email for user ${row.user_id}:`, userError?.message)
      failed++
      continue
    }

    const email    = authUser.user.email
    const token    = row.followup_response_token
    const baseUrl  = `${SITE_URL}/feedback/followup`

    const yesUrl    = `${baseUrl}?token=${token}&response=yes`
    const noUrl     = `${baseUrl}?token=${token}&response=no`
    const unsureUrl = `${baseUrl}?token=${token}&response=unsure`

    const body = [
      "Hi —",
      "",
      "A couple of days ago you completed your SPARK profile. We'd love",
      "to know how it's sitting with you now.",
      "",
      "One question: Does the profile still feel like you?",
      "",
      `[Yes, it fits]          ${yesUrl}`,
      `[Not quite]             ${noUrl}`,
      `[I'm still thinking]   ${unsureUrl}`,
      "",
      "Thanks for being part of the beta.",
      "— Jon, SPARK",
    ].join("\n")

    try {
      const res = await fetch("https://api.resend.com/emails", {
        method:  "POST",
        headers: {
          "Authorization": `Bearer ${RESEND_API_KEY}`,
          "Content-Type":  "application/json",
        },
        body: JSON.stringify({
          from:    FROM_EMAIL,
          to:      email,
          subject: "A quick follow-up on your SPARK profile",
          text:    body,
        }),
      })

      if (!res.ok) {
        const errBody = await res.text()
        console.error(`[send-followup-emails] Resend error for ${row.id}:`, res.status, errBody)
        failed++
        continue
      }

      await supabaseAdmin
        .from("spark_beta_feedback")
        .update({ followup_email_sent: true, followup_sent_at: new Date().toISOString() })
        .eq("id", row.id)

      sent++
    } catch (err) {
      console.error(`[send-followup-emails] unexpected error for ${row.id}:`, err)
      failed++
    }
  }

  return new Response(JSON.stringify({ sent, failed }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  })
})
