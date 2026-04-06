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
        if (calendarProfileId) {
          // List availability for a specific calendar profile
          const { data, error } = await supabaseClient
            .from('availability_profiles')
            .select('*')
            .eq('calendar_profile_id', calendarProfileId)
            .order('day_of_week', { ascending: true })
            .order('start_time', { ascending: true });

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else if (id && id !== 'availability') {
          // Get specific availability
          const { data, error } = await supabaseClient
            .from('availability_profiles')
            .select('*')
            .eq('id', id)
            .single();

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          throw new Error('calendar_profile_id is required');
        }
      }

      case 'POST': {
        if (authError || !user) {
          throw new Error('Unauthorized');
        }

        const body = await req.json();

        // Support both single and batch creation
        const items = Array.isArray(body) ? body : [body];
        const results = [];

        for (const item of items) {
          const {
            calendar_profile_id,
            day_of_week,
            start_time,
            end_time,
            is_active,
          } = item;

          // Validate required fields
          if (calendar_profile_id === undefined || day_of_week === undefined || !start_time || !end_time) {
            throw new Error('Missing required fields: calendar_profile_id, day_of_week, start_time, end_time');
          }

          // Validate day_of_week
          if (day_of_week < 0 || day_of_week > 6) {
            throw new Error('day_of_week must be between 0 (Sunday) and 6 (Saturday)');
          }

          // Verify user owns the calendar profile
          const { data: profile, error: profileError } = await supabaseClient
            .from('calendar_profiles')
            .select('user_id')
            .eq('id', calendar_profile_id)
            .single();

          if (profileError) throw profileError;
          if (profile.user_id !== user.id) {
            throw new Error('Unauthorized to create availability for this calendar profile');
          }

          const { data, error } = await supabaseClient
            .from('availability_profiles')
            .insert({
              calendar_profile_id,
              day_of_week,
              start_time,
              end_time,
              is_active: is_active ?? true,
            })
            .select()
            .single();

          if (error) throw error;
          results.push(data);
        }

        return new Response(JSON.stringify(Array.isArray(body) ? results : results[0]), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 201,
        });
      }

      case 'PUT':
      case 'PATCH': {
        if (authError || !user) {
          throw new Error('Unauthorized');
        }

        // Support batch update by calendar_profile_id
        if (calendarProfileId) {
          const body = await req.json();

          // Verify ownership
          const { data: profile, error: profileError } = await supabaseClient
            .from('calendar_profiles')
            .select('user_id')
            .eq('id', calendarProfileId)
            .single();

          if (profileError) throw profileError;
          if (profile.user_id !== user.id) {
            throw new Error('Unauthorized to update availability for this calendar profile');
          }

          // Delete all existing availability for this profile
          await supabaseClient
            .from('availability_profiles')
            .delete()
            .eq('calendar_profile_id', calendarProfileId);

          // Insert new availability slots
          if (Array.isArray(body) && body.length > 0) {
            const { data, error } = await supabaseClient
              .from('availability_profiles')
              .insert(
                body.map(slot => ({
                  calendar_profile_id: calendarProfileId,
                  day_of_week: slot.day_of_week,
                  start_time: slot.start_time,
                  end_time: slot.end_time,
                  is_active: slot.is_active ?? true,
                }))
              )
              .select();

            if (error) throw error;

            return new Response(JSON.stringify(data), {
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 200,
            });
          }

          return new Response(JSON.stringify([]), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }

        // Single availability update
        if (!id || id === 'availability') {
          throw new Error('Availability ID is required for updates');
        }

        const body = await req.json();

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseClient
          .from('availability_profiles')
          .select('calendar_profile:calendar_profiles(user_id)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.calendar_profile.user_id !== user.id) {
          throw new Error('Unauthorized to update this availability');
        }

        // Build update object
        const updates: any = {};
        if (body.day_of_week !== undefined) {
          if (body.day_of_week < 0 || body.day_of_week > 6) {
            throw new Error('day_of_week must be between 0 (Sunday) and 6 (Saturday)');
          }
          updates.day_of_week = body.day_of_week;
        }
        if (body.start_time !== undefined) updates.start_time = body.start_time;
        if (body.end_time !== undefined) updates.end_time = body.end_time;
        if (body.is_active !== undefined) updates.is_active = body.is_active;

        const { data, error } = await supabaseClient
          .from('availability_profiles')
          .update(updates)
          .eq('id', id)
          .select()
          .single();

        if (error) throw error;

        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 200,
        });
      }

      case 'DELETE': {
        if (authError || !user) {
          throw new Error('Unauthorized');
        }

        if (!id || id === 'availability') {
          throw new Error('Availability ID is required for deletion');
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseClient
          .from('availability_profiles')
          .select('calendar_profile:calendar_profiles(user_id)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.calendar_profile.user_id !== user.id) {
          throw new Error('Unauthorized to delete this availability');
        }

        const { error } = await supabaseClient
          .from('availability_profiles')
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
