import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

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

        if (!CF_WORKER_URL) {
            console.error('Missing CLOUDFLARE_WORKER_URL')
            throw new Error('Server configuration error')
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
