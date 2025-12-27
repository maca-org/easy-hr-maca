import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id, rubric } = await req.json();
    
    console.log(`[receive-rubric] Received rubric for job_id: ${job_id}`);

    // Validation
    if (!job_id) {
      console.error('[receive-rubric] Missing job_id');
      return new Response(
        JSON.stringify({ error: 'job_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!rubric) {
      console.error('[receive-rubric] Missing rubric data');
      return new Response(
        JSON.stringify({ error: 'rubric is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(job_id)) {
      console.error('[receive-rubric] Invalid job_id format:', job_id);
      return new Response(
        JSON.stringify({ error: 'Invalid job_id format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Update the job_openings table with the rubric
    const { data, error } = await supabase
      .from('job_openings')
      .update({ 
        rubric: rubric,
        updated_at: new Date().toISOString()
      })
      .eq('id', job_id)
      .select('id, title')
      .single();

    if (error) {
      console.error('[receive-rubric] Database error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update rubric', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!data) {
      console.error('[receive-rubric] Job not found:', job_id);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[receive-rubric] Successfully saved rubric for job: ${data.title || job_id}`);
    
    return new Response(
      JSON.stringify({ 
        success: true, 
        job_id, 
        job_title: data.title,
        message: 'Rubric saved successfully' 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[receive-rubric] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
