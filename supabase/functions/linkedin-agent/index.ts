import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.0"

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
    // Handle CORS preflight requests
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders })
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
        const asCaller = createClient(supabaseUrl, anonKey, {
            global: { headers: { Authorization: req.headers.get('Authorization') ?? '' } },
        })
        const { data: { user } } = await asCaller.auth.getUser()
        const { data: isOwner } = user ? await asCaller.rpc('is_owner') : { data: false }
        if (isOwner !== true) {
            return new Response(
                JSON.stringify({ error: 'Not authorized' }),
                { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        const body = await req.json()
        const { content } = body

        if (!content) {
            return new Response(
                JSON.stringify({ error: 'Missing content' }),
                { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
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
            return new Response(
                JSON.stringify({ error: data.error || 'Failed to post to LinkedIn' }),
                { status: response.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
            )
        }

        return new Response(
            JSON.stringify(data),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

    } catch (error) {
        console.error('Internal error:', error)
        return new Response(
            JSON.stringify({ error: error.message }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )
    }
})
