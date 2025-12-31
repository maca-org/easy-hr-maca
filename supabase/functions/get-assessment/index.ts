import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Rate limiting: IP -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 10; // 10 requests per minute
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(ip);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [ip, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(ip);
    }
  }
}, 60000);

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Rate limiting
  const clientIP = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || 
                   req.headers.get("x-real-ip") || 
                   "unknown";
  
  if (!checkRateLimit(clientIP)) {
    console.warn(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ error: "Too many requests. Please try again later." }),
      { status: 429, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
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

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(candidateId)) {
      console.error("Invalid candidateId format:", candidateId);
      return new Response(
        JSON.stringify({ error: "Invalid candidateId format" }),
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

    // Fetch job questions and user_id
    const { data: job, error: jobError } = await supabase
      .from("job_openings")
      .select("questions, title, user_id")
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

    // Fetch company name from profiles
    let companyName = "Company";
    if (job.user_id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_name")
        .eq("id", job.user_id)
        .single();
      
      if (profile?.company_name) {
        companyName = profile.company_name;
      }
    }

    console.log("Successfully fetched assessment data for candidate:", candidateId);

    // Sanitize questions to remove correct answers before sending to candidate
    const sanitizedQuestions = (job.questions as any[]).map((q: any) => {
      const { correct_answer, ...safeQuestion } = q;
      return safeQuestion;
    });

    return new Response(
      JSON.stringify({
        completed: false,
        candidate: {
          id: candidate.id,
          name: candidate.name,
          assessment_due_date: candidate.assessment_due_date,
        },
        questions: sanitizedQuestions,
        jobTitle: job.title,
        companyName: companyName,
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
