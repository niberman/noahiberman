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
    const status = url.searchParams.get('status');

    switch (req.method) {
      case 'GET': {
        if (id && id !== 'bookings') {
          // Get specific booking with details
          const { data, error } = await supabaseClient
            .from('bookings')
            .select(`
              *,
              meeting_type:meeting_types(*),
              calendar_profile:calendar_profiles(*)
            `)
            .eq('id', id)
            .single();

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else if (calendarProfileId) {
          // List bookings for a specific calendar profile
          let query = supabaseClient
            .from('bookings')
            .select(`
              *,
              meeting_type:meeting_types(*)
            `)
            .eq('calendar_profile_id', calendarProfileId)
            .order('scheduled_start', { ascending: true });

          if (status) {
            query = query.eq('status', status);
          }

          const { data, error } = await query;

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        } else {
          // List all bookings for user's calendar profiles
          if (authError || !user) {
            throw new Error('Unauthorized');
          }

          let query = supabaseClient
            .from('bookings')
            .select(`
              *,
              meeting_type:meeting_types(*),
              calendar_profile:calendar_profiles!inner(*)
            `)
            .eq('calendar_profile.user_id', user.id)
            .order('scheduled_start', { ascending: true });

          if (status) {
            query = query.eq('status', status);
          }

          const { data, error } = await query;

          if (error) throw error;

          return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
          });
        }
      }

      case 'POST': {
        // Public endpoint - anyone can create a booking
        const body = await req.json();
        const {
          meeting_type_id,
          calendar_profile_id,
          guest_name,
          guest_email,
          guest_phone,
          scheduled_start,
          scheduled_end,
          timezone,
          notes,
        } = body;

        // Validate required fields
        if (!meeting_type_id || !calendar_profile_id || !guest_name || !guest_email || !scheduled_start || !scheduled_end) {
          throw new Error('Missing required fields: meeting_type_id, calendar_profile_id, guest_name, guest_email, scheduled_start, scheduled_end');
        }

        // Validate email format
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(guest_email)) {
          throw new Error('Invalid email format');
        }

        // Verify the meeting type belongs to the calendar profile
        const { data: meetingType, error: mtError } = await supabaseClient
          .from('meeting_types')
          .select('calendar_profile_id, is_active')
          .eq('id', meeting_type_id)
          .single();

        if (mtError) throw new Error('Meeting type not found');
        if (meetingType.calendar_profile_id !== calendar_profile_id) {
          throw new Error('Meeting type does not belong to this calendar profile');
        }
        if (!meetingType.is_active) {
          throw new Error('This meeting type is not currently available');
        }

        // Verify calendar profile is active
        const { data: profile, error: profileError } = await supabaseClient
          .from('calendar_profiles')
          .select('is_active')
          .eq('id', calendar_profile_id)
          .single();

        if (profileError) throw new Error('Calendar profile not found');
        if (!profile.is_active) {
          throw new Error('This calendar is not currently accepting bookings');
        }

        // Check for conflicting bookings
        const { data: conflicts, error: conflictError } = await supabaseClient
          .from('bookings')
          .select('id')
          .eq('calendar_profile_id', calendar_profile_id)
          .eq('status', 'confirmed')
          .or(`and(scheduled_start.lt.${scheduled_end},scheduled_end.gt.${scheduled_start})`);

        if (conflictError) throw conflictError;
        if (conflicts && conflicts.length > 0) {
          throw new Error('This time slot is no longer available');
        }

        const { data, error } = await supabaseClient
          .from('bookings')
          .insert({
            meeting_type_id,
            calendar_profile_id,
            guest_name,
            guest_email,
            guest_phone,
            scheduled_start,
            scheduled_end,
            timezone: timezone ?? 'America/Denver',
            notes,
            status: 'confirmed',
          })
          .select(`
            *,
            meeting_type:meeting_types(*),
            calendar_profile:calendar_profiles(*)
          `)
          .single();

        if (error) throw error;

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

        if (!id || id === 'bookings') {
          throw new Error('Booking ID is required for updates');
        }

        const body = await req.json();

        // Verify ownership through calendar profile
        const { data: existing, error: fetchError } = await supabaseClient
          .from('bookings')
          .select('calendar_profile:calendar_profiles(user_id)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.calendar_profile.user_id !== user.id) {
          throw new Error('Unauthorized to update this booking');
        }

        // Build update object
        const updates: any = {};
        if (body.status !== undefined) updates.status = body.status;
        if (body.cancellation_reason !== undefined) updates.cancellation_reason = body.cancellation_reason;
        if (body.notes !== undefined) updates.notes = body.notes;
        if (body.reminder_sent !== undefined) updates.reminder_sent = body.reminder_sent;

        const { data, error } = await supabaseClient
          .from('bookings')
          .update(updates)
          .eq('id', id)
          .select(`
            *,
            meeting_type:meeting_types(*),
            calendar_profile:calendar_profiles(*)
          `)
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

        if (!id || id === 'bookings') {
          throw new Error('Booking ID is required for deletion');
        }

        // Verify ownership
        const { data: existing, error: fetchError } = await supabaseClient
          .from('bookings')
          .select('calendar_profile:calendar_profiles(user_id)')
          .eq('id', id)
          .single();

        if (fetchError) throw fetchError;
        if (existing.calendar_profile.user_id !== user.id) {
          throw new Error('Unauthorized to delete this booking');
        }

        const { error } = await supabaseClient
          .from('bookings')
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
