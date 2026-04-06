import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      {
        global: {
          headers: { Authorization: req.headers.get('Authorization')! },
        },
      }
    );

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];

    switch (req.method) {
      case 'GET': {
        if (id && id !== 'calendar-profiles') {
          // Get specific calendar profile
          const { data, error } = await supabaseClient
            .from('calendar_profiles')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          // List all calendar profiles for the user
          if (authError || !user) {
            throw new Error('Unauthorized');
          }

          const { data, error } = await supabaseClient
            .from('calendar_profiles')
            .select('*')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      case 'POST': {
        if (authError || !user) {
          throw new Error('Unauthorized');
        }

        const body = await req.json();
        const { name, slug, timezone, description, is_active } = body;

        // Validate required fields
        if (!name || !slug || !timezone) {
          throw new Error('Missing required fields: name, slug, timezone');
        }

        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(slug)) {
          throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
        }

        const { data, error } = await supabaseClient
          .from('calendar_profiles')
          .insert({
            user_id: user.id,
            name,
            slug,
            timezone,
            description,
            is_active: is_active ?? true,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('A calendar profile with this slug already exists');
          }
          throw error;
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      case 'PUT':
      case 'PATCH': {
        if (authError || !user) {
          throw new Error('Unauthorized');
        }

        if (!id || id === 'calendar-profiles') {
          throw new Error('Profile ID is required for updates');
        }

        const body = await req.json();
        const { name, slug, timezone, description, is_active } = body;

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseClient
          .from('calendar_profiles')
          .select('user_id')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.user_id !== user.id) {
          throw new Error('Unauthorized to update this profile');
        }

        // Build update object with only provided fields
        const updates: any = {};
        if (name !== undefined) updates.name = name;
        if (slug !== undefined) {
          if (!/^[a-z0-9-]+$/.test(slug)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
          }
          updates.slug = slug;
        }
        if (timezone !== undefined) updates.timezone = timezone;
        if (description !== undefined) updates.description = description;
        if (is_active !== undefined) updates.is_active = is_active;

        const { data, error } = await supabaseClient
          .from('calendar_profiles')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('A calendar profile with this slug already exists');
          }
          throw error;
        }

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'DELETE': {
        if (authError || !user) {
          throw new Error('Unauthorized');
        }

        if (!id || id === 'calendar-profiles') {
          throw new Error('Profile ID is required for deletion');
        }

        // Verify ownership before deleting
        const { data: existing, error: fetchError } = await supabaseClient
          .from('calendar_profiles')
          .select('user_id')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.user_id !== user.id) {
          throw new Error('Unauthorized to delete this profile');
        }

        const { error } = await supabaseClient
          .from('calendar_profiles')
          .delete()
          .eq('id', id);

        if (error) throw error;

        return new Response(JSON.stringify({ success: true }), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      default:
        return new Response('Method not allowed', {
          headers: corsHeaders,
          status: 405,
        });
    }
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: error.message === 'Unauthorized' ? 401 : 400,
    });
  }
});
