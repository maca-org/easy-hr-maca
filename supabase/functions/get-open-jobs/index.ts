import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get user's applied job IDs from request body (optional)
    const body = await req.json().catch(() => ({}));
    const { excludeJobIds = [] } = body;

    console.log('Fetching open jobs, excluding:', excludeJobIds.length, 'jobs');

    // Fetch all job openings with profile info for company name
    const { data: jobs, error } = await supabaseAdmin
      .from('job_openings')
      .select(`
        id,
        title,
        description,
        slug,
        created_at,
        profiles:user_id (
          company_name
        )
      `)
      .order('created_at', { ascending: false })
      .limit(20);

    if (error) {
      console.error('Error fetching jobs:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch jobs' }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Filter out jobs the user has already applied to
    const filteredJobs = (jobs || [])
      .filter(job => !excludeJobIds.includes(job.id))
      .map(job => ({
        id: job.id,
        title: job.title,
        description: job.description,
        slug: job.slug,
        created_at: job.created_at,
        company_name: (job.profiles as any)?.company_name || 'Company'
      }));

    console.log('Returning', filteredJobs.length, 'jobs');

    return new Response(
      JSON.stringify(filteredJobs),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-open-jobs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
