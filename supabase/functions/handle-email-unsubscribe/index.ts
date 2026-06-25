import { createClient } from 'npm:@supabase/supabase-js@2'
import { withSentry } from "../_shared/sentry.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(data: Record<string, unknown>, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

async function sha256Hex(input: string): Promise<string> {
  const bytes = new TextEncoder().encode(input)
  const digest = await crypto.subtle.digest('SHA-256', bytes)
  return Array.from(new Uint8Array(digest))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('')
}

Deno.serve(withSentry("handle-email-unsubscribe", async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  if (req.method !== 'GET' && req.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405)
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseServiceKey) {
    return jsonResponse({ error: 'Server configuration error' }, 500)
  }

  // Extract token from query params (GET) or body (POST)
  const url = new URL(req.url)
  let token: string | null = url.searchParams.get('token')

  if (req.method === 'POST') {
    const contentType = req.headers.get('content-type') ?? ''
    if (contentType.includes('application/x-www-form-urlencoded')) {
      const formText = await req.text()
      const params = new URLSearchParams(formText)
      if (!params.get('List-Unsubscribe')) {
        const formToken = params.get('token')
        if (formToken) token = formToken
      }
    } else {
      try {
        const body = await req.json()
        if (body.token) token = body.token
      } catch {
        // Fall through — token stays from query param
      }
    }
  }

  if (!token) {
    return jsonResponse({ error: 'Token is required' }, 400)
  }

  // Hash the token client-side; we never compare plaintext against the DB.
  const tokenHash = await sha256Hex(token)

  const supabase = createClient(supabaseUrl, supabaseServiceKey)

  const { data: tokenRecord, error: lookupError } = await supabase
    .from('email_unsubscribe_tokens')
    .select('email, used_at')
    .eq('token_hash', tokenHash)
    .maybeSingle()

  if (lookupError || !tokenRecord) {
    return jsonResponse({ error: 'Invalid or expired token' }, 404)
  }

  if (tokenRecord.used_at) {
    return jsonResponse({ valid: false, reason: 'already_unsubscribed' })
  }

  if (req.method === 'GET') {
    return jsonResponse({ valid: true })
  }

  // POST: atomic check-and-update keyed on the hash
  const { data: updated, error: updateError } = await supabase
    .from('email_unsubscribe_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('token_hash', tokenHash)
    .is('used_at', null)
    .select('email')
    .maybeSingle()

  if (updateError) {
    console.error('Failed to mark token as used', { error: updateError })
    return jsonResponse({ error: 'Failed to process unsubscribe' }, 500)
  }

  if (!updated) {
    return jsonResponse({ success: false, reason: 'already_unsubscribed' })
  }

  const { error: suppressError } = await supabase
    .from('suppressed_emails')
    .upsert(
      { email: tokenRecord.email.toLowerCase(), reason: 'unsubscribe' },
      { onConflict: 'email' },
    )

  if (suppressError) {
    console.error('Failed to suppress email', { error: suppressError })
    return jsonResponse({ error: 'Failed to process unsubscribe' }, 500)
  }

  console.log('Email unsubscribed')

  return jsonResponse({ success: true })
}))
