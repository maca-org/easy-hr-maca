import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId } = await req.json();

    if (!candidateId) {
      console.error("Missing candidateId");
      return new Response(
        JSON.stringify({ error: "Missing candidateId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Fetching assessment for candidate:", candidateId);

    // Create Supabase client with service role key to bypass RLS
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Fetch candidate data
    const { data: candidate, error: candidateError } = await supabase
      .from("candidates")
      .select("id, name, email, job_id, completed_test, assessment_due_date, assessment_sent")
      .eq("id", candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error("Candidate not found:", candidateError);
      return new Response(
        JSON.stringify({ error: "Assessment not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if already completed
    if (candidate.completed_test) {
      console.log("Assessment already completed for candidate:", candidateId);
      return new Response(
        JSON.stringify({ 
          completed: true,
          candidate: { name: candidate.name }
        }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Check if expired
    if (candidate.assessment_due_date) {
      const dueDate = new Date(candidate.assessment_due_date);
      if (dueDate < new Date()) {
        console.log("Assessment expired for candidate:", candidateId);
        return new Response(
          JSON.stringify({ error: "Assessment has expired" }),
          { status: 410, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    // Fetch job questions
    const { data: job, error: jobError } = await supabase
      .from("job_openings")
      .select("questions, title")
      .eq("id", candidate.job_id)
      .single();

    if (jobError || !job) {
      console.error("Job not found:", jobError);
      return new Response(
        JSON.stringify({ error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!job.questions || (Array.isArray(job.questions) && job.questions.length === 0)) {
      console.error("No questions found for job:", candidate.job_id);
      return new Response(
        JSON.stringify({ error: "No questions available for this assessment" }),
        { status: 404, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Successfully fetched assessment data for candidate:", candidateId);

    return new Response(
      JSON.stringify({
        completed: false,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          assessment_due_date: candidate.assessment_due_date,
        },
        questions: job.questions,
        jobTitle: job.title,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Error in get-assessment:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
