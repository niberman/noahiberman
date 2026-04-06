import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
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

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser();

    const url = new URL(req.url);
    const pathParts = url.pathname.split('/').filter(Boolean);
    const id = pathParts[pathParts.length - 1];
    const calendarProfileId = url.searchParams.get('calendar_profile_id');

    switch (req.method) {
      case 'GET': {
        if (id && id !== 'meeting-types') {
          // Get specific meeting type with calendar profile
          const { data, error } = await supabaseClient
            .from('meeting_types')
            .select('*, calendar_profile:calendar_profiles(*)')
            .eq('id', id)
            .single();

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else if (calendarProfileId) {
          // List meeting types for a specific calendar profile
          const { data, error } = await supabaseClient
            .from('meeting_types')
            .select('*')
            .eq('calendar_profile_id', calendarProfileId)
            .order('created_at', { ascending: false });

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          // List all meeting types for user's calendar profiles
          if (authError || !user) {
            throw new Error('Unauthorized');
          }

          const { data, error } = await supabaseClient
            .from('meeting_types')
            .select('*, calendar_profile:calendar_profiles!inner(*)')
            .eq('calendar_profile.user_id', user.id)
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
        const {
          calendar_profile_id,
          name,
          slug,
          duration_minutes,
          description,
          location_type,
          location_details,
          buffer_before_minutes,
          buffer_after_minutes,
          color,
          is_active,
        } = body;

        // Validate required fields
        if (!calendar_profile_id || !name || !slug || !duration_minutes) {
          throw new Error('Missing required fields: calendar_profile_id, name, slug, duration_minutes');
        }

        // Validate slug format
        if (!/^[a-z0-9-]+$/.test(slug)) {
          throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
        }

        // Verify user owns the calendar profile
        const { data: profile, error: profileError } = await supabaseClient
          .from('calendar_profiles')
          .select('user_id')
          .eq('id', calendar_profile_id)
          .single();

        if (profileError) throw profileError;
        if (profile.user_id !== user.id) {
          throw new Error('Unauthorized to create meeting types for this calendar profile');
        }

        const { data, error } = await supabaseClient
          .from('meeting_types')
          .insert({
            calendar_profile_id,
            name,
            slug,
            duration_minutes,
            description,
            location_type,
            location_details,
            buffer_before_minutes: buffer_before_minutes ?? 0,
            buffer_after_minutes: buffer_after_minutes ?? 0,
            color: color ?? '#3b82f6',
            is_active: is_active ?? true,
          })
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('A meeting type with this slug already exists for this calendar profile');
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

        if (!id || id === 'meeting-types') {
          throw new Error('Meeting type ID is required for updates');
        }

        const body = await req.json();

        // Verify ownership through calendar profile
        const { data: existing, error: fetchError } = await supabaseClient
          .from('meeting_types')
          .select('calendar_profile:calendar_profiles(user_id)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.calendar_profile.user_id !== user.id) {
          throw new Error('Unauthorized to update this meeting type');
        }

        // Build update object
        const updates: any = {};
        if (body.name !== undefined) updates.name = body.name;
        if (body.slug !== undefined) {
          if (!/^[a-z0-9-]+$/.test(body.slug)) {
            throw new Error('Slug must contain only lowercase letters, numbers, and hyphens');
          }
          updates.slug = body.slug;
        }
        if (body.duration_minutes !== undefined) updates.duration_minutes = body.duration_minutes;
        if (body.description !== undefined) updates.description = body.description;
        if (body.location_type !== undefined) updates.location_type = body.location_type;
        if (body.location_details !== undefined) updates.location_details = body.location_details;
        if (body.buffer_before_minutes !== undefined) updates.buffer_before_minutes = body.buffer_before_minutes;
        if (body.buffer_after_minutes !== undefined) updates.buffer_after_minutes = body.buffer_after_minutes;
        if (body.color !== undefined) updates.color = body.color;
        if (body.is_active !== undefined) updates.is_active = body.is_active;

        const { data, error } = await supabaseClient
          .from('meeting_types')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) {
          if (error.code === '23505') {
            throw new Error('A meeting type with this slug already exists for this calendar profile');
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

        if (!id || id === 'meeting-types') {
          throw new Error('Meeting type ID is required for deletion');
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseClient
          .from('meeting_types')
          .select('calendar_profile:calendar_profiles(user_id)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.calendar_profile.user_id !== user.id) {
          throw new Error('Unauthorized to delete this meeting type');
        }

        const { error } = await supabaseClient
          .from('meeting_types')
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
