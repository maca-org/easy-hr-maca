import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { jobId, candidateIds, dueDate } = await req.json();

    if (!jobId || !candidateIds || candidateIds.length === 0 || !dueDate) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const n8nEmailWebhookUrl = Deno.env.get("N8N_EMAIL_WEBHOOK_URL");
    
    if (!n8nEmailWebhookUrl) {
      console.error("N8N_EMAIL_WEBHOOK_URL is not configured");
      return new Response(
        JSON.stringify({ error: "Email webhook URL not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get app URL from request origin or environment
    const origin = req.headers.get("origin") || req.headers.get("referer") || "http://localhost:8080";
    const appUrl = new URL(origin).origin;

    // Fetch job details and user profile
    const { data: job, error: jobError } = await supabase
      .from("job_openings")
      .select("title, user_id")
      .eq("id", jobId)
      .single();

    if (jobError || !job) {
      console.error("Error fetching job:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("company_name")
      .eq("id", job.user_id)
      .single();

    const companyName = profile?.company_name || "Our Company";

    // Fetch candidate details
    const { data: candidates, error: candidatesError } = await supabase
      .from("candidates")
      .select("id, name, email")
      .in("id", candidateIds);

    if (candidatesError || !candidates) {
      console.error("Error fetching candidates:", candidatesError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch candidates" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Format due date
    const formattedDueDate = new Date(dueDate).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });

    // Send to n8n and update candidates
    const emailResults = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const assessmentLink = `${appUrl}/assessment/${candidate.id}`;

        // Send to n8n webhook for email
        console.log(`Sending email request to n8n for candidate: ${candidate.email}`);
        
        const n8nResponse = await fetch(n8nEmailWebhookUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            candidate_id: candidate.id,
            candidate_name: candidate.name,
            candidate_email: candidate.email,
            job_title: job.title,
            assessment_link: assessmentLink,
            due_date: formattedDueDate,
            due_date_raw: dueDate,
            company_name: companyName,
          }),
        });

        if (!n8nResponse.ok) {
          const errorText = await n8nResponse.text();
          console.error(`n8n webhook error for ${candidate.email}:`, errorText);
          throw new Error(`n8n webhook failed: ${n8nResponse.status}`);
        }

        console.log(`n8n webhook success for ${candidate.email}`);

        // Update candidate record
        const { error: updateError } = await supabase
          .from("candidates")
          .update({
            assessment_sent: true,
            assessment_sent_at: new Date().toISOString(),
            assessment_due_date: dueDate,
            assessment_link: assessmentLink,
          })
          .eq("id", candidate.id);

        if (updateError) {
          console.error(`Failed to update candidate ${candidate.id}:`, updateError);
          throw updateError;
        }

        return { candidateId: candidate.id, email: candidate.email, success: true };
      })
    );

    // Count successes and failures
    const successful = emailResults.filter((r) => r.status === "fulfilled").length;
    const failed = emailResults.filter((r) => r.status === "rejected").length;

    console.log(`Sent ${successful} assessments to n8n, ${failed} failed`);

    if (failed > 0) {
      const errors = emailResults
        .filter((r) => r.status === "rejected")
        .map((r) => (r as PromiseRejectedResult).reason);
      
      console.error("Email sending errors:", errors);
      
      return new Response(
        JSON.stringify({
          success: successful > 0,
          sentCount: successful,
          failedCount: failed,
          message: `Sent ${successful} assessment(s), ${failed} failed`,
        }),
        { status: 207, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        sentCount: successful,
        message: `Assessment sent to ${successful} candidate(s)`,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error: any) {
    console.error("Error in send-assessments function:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
