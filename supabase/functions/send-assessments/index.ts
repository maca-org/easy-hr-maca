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
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Generate unique assessment links and update candidates
    const updates = candidateIds.map((candidateId: string) => {
      const assessmentLink = `${supabaseUrl.replace('https://', 'https://app.')}/assessment/${candidateId}`;
      
      return supabase
        .from("candidates")
        .update({
          assessment_sent: true,
          assessment_sent_at: new Date().toISOString(),
          assessment_due_date: dueDate,
          assessment_link: assessmentLink,
        })
        .eq("id", candidateId);
    });

    const results = await Promise.all(updates);

    // Check for errors
    const errors = results.filter(r => r.error);
    if (errors.length > 0) {
      console.error("Errors updating candidates:", errors);
      return new Response(
        JSON.stringify({ 
          error: "Failed to update some candidates",
          details: errors 
        }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch candidate details for email (mock for now)
    const { data: candidates } = await supabase
      .from("candidates")
      .select("name, email")
      .in("id", candidateIds);

    console.log("Assessments sent to:", candidates);
    console.log("Due date:", dueDate);
    
    // TODO: Implement actual email sending using Resend
    // For now, we just log and mark as sent

    return new Response(
      JSON.stringify({ 
        success: true, 
        sentCount: candidateIds.length,
        message: `Assessment sent to ${candidateIds.length} candidate(s)` 
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
