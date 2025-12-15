import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { Resend } from "https://esm.sh/resend@2.0.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

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

    // Send emails via Resend and update candidates
    const emailResults = await Promise.allSettled(
      candidates.map(async (candidate) => {
        const assessmentLink = `${appUrl}/assessment/${candidate.id}`;

        // Send email via Resend
        console.log(`Sending assessment email to: ${candidate.email}`);
        
        const emailResponse = await resend.emails.send({
          from: `${companyName} <onboarding@resend.dev>`,
          to: [candidate.email],
          subject: `Assessment Invitation - ${job.title}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <h1 style="color: #333; margin-bottom: 20px;">Hello ${candidate.name}!</h1>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                You have been invited to complete an assessment for the <strong>${job.title}</strong> position at <strong>${companyName}</strong>.
              </p>
              
              <p style="color: #555; font-size: 16px; line-height: 1.6;">
                <strong>Due Date:</strong> ${formattedDueDate}
              </p>
              
              <div style="margin: 30px 0; text-align: center;">
                <a href="${assessmentLink}" 
                   style="background-color: #4F46E5; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                  Start Assessment
                </a>
              </div>
              
              <p style="color: #777; font-size: 14px; margin-top: 30px;">
                If the button doesn't work, copy and paste this link into your browser:<br>
                <a href="${assessmentLink}" style="color: #4F46E5;">${assessmentLink}</a>
              </p>
              
              <hr style="border: none; border-top: 1px solid #eee; margin: 30px 0;">
              
              <p style="color: #999; font-size: 12px;">
                Best regards,<br>
                ${companyName} HR Team
              </p>
            </div>
          `,
        });

        if (emailResponse.error) {
          console.error(`Resend error for ${candidate.email}:`, emailResponse.error);
          throw new Error(`Email failed: ${emailResponse.error.message}`);
        }

        console.log(`Email sent successfully to ${candidate.email}`);

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

    console.log(`Sent ${successful} assessments via Resend, ${failed} failed`);

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
