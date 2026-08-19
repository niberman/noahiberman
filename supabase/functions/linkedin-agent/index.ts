import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import {
    BASE_CORS_HEADERS as corsHeaders,
    errorMessage,
    errorResponse,
    jsonResponse,
    preflightResponse,
} from "../_shared/http.ts"
import { callerClient, isCallerOwner } from "../_shared/supabase.ts"

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return preflightResponse(corsHeaders)
    }

    try {
        const CF_WORKER_URL = Deno.env.get('CLOUDFLARE_WORKER_URL')
        const CF_API_KEY = Deno.env.get('CLOUDFLARE_API_KEY')
        const supabaseUrl = Deno.env.get('SUPABASE_URL')
        const anonKey = Deno.env.get('SUPABASE_ANON_KEY')

        if (!CF_WORKER_URL || !supabaseUrl || !anonKey) {
            console.error('Missing CLOUDFLARE_WORKER_URL / Supabase environment')
            throw new Error('Server configuration error')
        }

        // Owner gate: verify_jwt only proves the caller holds the anon key, which
        // every visitor has. Posting to LinkedIn is owner-only.
        const asCaller = callerClient(supabaseUrl, anonKey, req.headers.get('Authorization'))
        if (!await isCallerOwner(asCaller)) {
            return errorResponse('Not authorized', 401, corsHeaders)
        }

        const body = await req.json()
        const { content } = body

        if (!content) {
            return errorResponse('Missing content', 400, corsHeaders)
        }

        // Forward to Cloudflare Worker
        const response = await fetch(CF_WORKER_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                ...(CF_API_KEY ? { 'Authorization': `Bearer ${CF_API_KEY}` } : {}),
            },
            body: JSON.stringify(body),
        })

        const data = await response.json()

        if (!response.ok) {
            return errorResponse(
                data.error || 'Failed to post to LinkedIn',
                response.status,
                corsHeaders,
            )
        }

        return jsonResponse(data, 200, corsHeaders)

    } catch (error) {
        console.error('Internal error:', error)
        return errorResponse(errorMessage(error), 500, corsHeaders)
    }
})
