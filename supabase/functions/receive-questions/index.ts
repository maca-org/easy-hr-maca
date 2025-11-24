import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

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
    const { job_id, mcq, open_questions } = await req.json();

    // Validate required fields
    if (!job_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing job_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the job from database
    const { data: job, error: fetchError } = await supabase
      .from('jobs')
      .select('*')
      .eq('id', job_id)
      .maybeSingle();

    if (fetchError) {
      console.error('Error fetching job:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: `Database error: ${fetchError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!job) {
      return new Response(
        JSON.stringify({ success: false, error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update job with questions
    const questions = {
      mcq: mcq || [],
      open: open_questions || []
    };

    const { error: updateError } = await supabase
      .from('jobs')
      .update({ questions })
      .eq('id', job_id);

    if (updateError) {
      console.error('Error updating job:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to update job: ${updateError.message}` }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Successfully saved questions for job ${job_id}`);

    return new Response(
      JSON.stringify({ success: true, message: 'Questions saved into job successfully' }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('Error in receive-questions function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
