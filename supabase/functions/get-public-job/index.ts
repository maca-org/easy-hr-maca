import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { job_id } = await req.json();

    if (!job_id) {
      return new Response(
        JSON.stringify({ error: 'Job ID is required' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 400 
        }
      );
    }

    // Use service role to bypass RLS for public job viewing
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch job with owner's company name from profiles
    const { data: job, error: jobError } = await supabase
      .from('job_openings')
      .select(`
        id,
        title,
        description,
        created_at,
        user_id
      `)
      .eq('id', job_id)
      .single();

    if (jobError || !job) {
      console.error('Job fetch error:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { 
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          status: 404 
        }
      );
    }

    // Fetch company name from profiles
    let companyName = null;
    if (job.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', job.user_id)
        .single();
      
      companyName = profile?.company_name || null;
    }

    // Return public job info (without sensitive data)
    const publicJob = {
      id: job.id,
      title: job.title,
      description: job.description,
      company_name: companyName,
      created_at: job.created_at,
    };

    console.log('Public job fetched:', publicJob.id);

    return new Response(
      JSON.stringify(publicJob),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in get-public-job:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
