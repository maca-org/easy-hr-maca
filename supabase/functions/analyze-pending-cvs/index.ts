import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const PLAN_LIMITS: Record<string, number> = {
  free: 25,
  starter: 100,
  pro: 250,
  business: 1000,
  enterprise: 999999
};

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const CV_ANALYSIS_WEBHOOK_URL = Deno.env.get("CV_ANALYSIS_WEBHOOK_URL");

    // Create admin client for database operations
    const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // Get the authorization header to verify the user
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Verify the user
    const supabaseClient = createClient(
      SUPABASE_URL,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      {
        global: { headers: { Authorization: authHeader } }
      }
    );

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser();
    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid authorization" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('User authenticated:', user.id);

    // Get candidate IDs from request body
    const { candidate_ids } = await req.json();

    if (!candidate_ids || !Array.isArray(candidate_ids) || candidate_ids.length === 0) {
      return new Response(
        JSON.stringify({ error: "candidate_ids array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log('Processing candidates:', candidate_ids.length);

    // Get employer profile for credit check
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_type, monthly_unlocked_count')
      .eq('id', user.id)
      .single();

    if (profileError) {
      console.error('Error fetching profile:', profileError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch user profile" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const planType = profile?.plan_type || 'free';
    const limit = PLAN_LIMITS[planType] ?? 25;
    let used = profile?.monthly_unlocked_count || 0;

    console.log('Credit status:', { planType, used, limit, available: limit - used });

    let processed = 0;
    let skipped = 0;
    const processedIds: string[] = [];

    // Process each candidate
    for (const candidateId of candidate_ids) {
      // Check if credits are available
      if (used >= limit) {
        skipped = candidate_ids.length - processed;
        console.log('No credits remaining. Skipping remaining:', skipped);
        break;
      }

      // Fetch candidate with job details including cv_file_path
      const { data: candidate, error: candidateError } = await supabaseAdmin
        .from('candidates')
        .select(`
          id, 
          cv_text, 
          cv_rate, 
          cv_file_path,
          job_id,
          user_id,
          job_openings!inner(title, description)
        `)
        .eq('id', candidateId)
        .single();

      if (candidateError || !candidate) {
        console.error('Error fetching candidate:', candidateId, candidateError);
        continue;
      }

      // Verify the candidate belongs to the user
      if (candidate.user_id !== user.id) {
        console.log('Candidate does not belong to user:', candidateId);
        continue;
      }

      // Skip if already analyzed (cv_rate > 0)
      if (candidate.cv_rate > 0) {
        console.log('Candidate already analyzed, skipping:', candidateId);
        continue;
      }

      // Skip if no CV text AND no cv_file_path
      if (!candidate.cv_text && !candidate.cv_file_path) {
        console.log('No CV text or file for candidate:', candidateId);
        continue;
      }

      // Use 1 credit
      used++;
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({ monthly_unlocked_count: used })
        .eq('id', user.id);

      if (updateError) {
        console.error('Error updating credit count:', updateError);
        // Don't stop processing, just log the error
      } else {
        console.log('Credit used. New count:', used, '/', limit);
      }

      // Send to n8n for CV analysis
      if (CV_ANALYSIS_WEBHOOK_URL) {
        const jobData = candidate.job_openings as any;
        const callback_url = `${SUPABASE_URL}/functions/v1/receive-cv-analysis`;

        // Generate signed URL if cv_file_path exists
        let cvSignedUrl = '';
        if (candidate.cv_file_path) {
          const { data: signedUrlData } = await supabaseAdmin.storage
            .from('cvs')
            .createSignedUrl(candidate.cv_file_path, 3600);
          cvSignedUrl = signedUrlData?.signedUrl || '';
        }

        try {
          const analysisResponse = await fetch(CV_ANALYSIS_WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              candidate_id: candidateId,
              job_id: candidate.job_id,
              cv: candidate.cv_text || '', // Send cv_text if available
              cv_url: cvSignedUrl,
              cv_file_path: candidate.cv_file_path || '',
              job_description: jobData.description,
              job_title: jobData.title,
              callback_url
            }),
          });

          if (!analysisResponse.ok) {
            console.error('CV analysis trigger failed for:', candidateId, await analysisResponse.text());
          } else {
            console.log('CV analysis triggered for:', candidateId);
            processed++;
            processedIds.push(candidateId);
          }
        } catch (webhookError) {
          console.error('Error triggering CV analysis:', webhookError);
        }
      } else {
        console.log('CV_ANALYSIS_WEBHOOK_URL not configured');
        processed++;
        processedIds.push(candidateId);
      }
    }

    console.log('Processing complete:', { processed, skipped, remaining_credits: limit - used });

    return new Response(
      JSON.stringify({
        success: true,
        processed,
        skipped,
        remaining_credits: limit - used,
        processed_ids: processedIds
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in analyze-pending-cvs:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
