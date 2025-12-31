import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface WelcomeEmailRequest {
  email: string;
  companyName?: string;
}

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[WELCOME-EMAIL] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, companyName }: WelcomeEmailRequest = await req.json();
    
    logStep("Sending welcome email", { email, companyName });

    const emailResponse = await resend.emails.send({
      from: "Candidate Assess <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to Candidate Assess! 🎉",
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
          <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
            <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
              <h1 style="color: white; font-size: 32px; margin: 0;">🎉 Welcome!</h1>
              <p style="color: rgba(255,255,255,0.9); font-size: 18px; margin-top: 10px;">You're all set to start hiring smarter</p>
            </div>
            
            <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
              <h2 style="color: #18181b; font-size: 24px; margin: 0 0 20px;">
                ${companyName ? `Hello ${companyName}!` : 'Hello!'}
              </h2>
              
              <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                Thank you for joining Candidate Assess. We're excited to help you find the perfect candidates faster with AI-powered screening.
              </p>
              
              <div style="background: #f4f4f5; border-radius: 12px; padding: 24px; margin: 24px 0;">
                <h3 style="color: #18181b; font-size: 16px; margin: 0 0 16px;">Your Free Plan Includes:</h3>
                <ul style="color: #52525b; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>25 candidate analyses per month</li>
                  <li>AI-powered CV screening</li>
                  <li>Custom assessment tests</li>
                  <li>Candidate insights & recommendations</li>
                </ul>
              </div>
              
              <div style="background: linear-gradient(135deg, #fef3c7 0%, #fde68a 100%); border-radius: 12px; padding: 20px; margin: 24px 0;">
                <h3 style="color: #92400e; font-size: 14px; margin: 0 0 8px;">💡 Quick Start Guide</h3>
                <ol style="color: #78350f; font-size: 14px; line-height: 1.8; margin: 0; padding-left: 20px;">
                  <li>Create your first job opening</li>
                  <li>Upload candidate CVs or share your job link</li>
                  <li>Review AI-powered insights</li>
                  <li>Send assessments to top candidates</li>
                </ol>
              </div>
              
              <a href="https://candidateassess.com/jobs" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; margin-top: 20px; font-size: 16px;">
                Create Your First Job
              </a>
              
              <p style="color: #71717a; font-size: 14px; margin-top: 30px; line-height: 1.6;">
                Need more capacity? <a href="https://candidateassess.com/settings/subscription" style="color: #6366f1; text-decoration: none; font-weight: 500;">Upgrade your plan</a> anytime to unlock more candidates and premium features.
              </p>
            </div>
            
            <div style="text-align: center; margin-top: 30px;">
              <p style="color: #a1a1aa; font-size: 12px; margin: 0;">
                © ${new Date().getFullYear()} Candidate Assess. All rights reserved.
              </p>
              <p style="color: #a1a1aa; font-size: 12px; margin-top: 8px;">
                Questions? Reply to this email and we'll help you out.
              </p>
            </div>
          </div>
        </body>
        </html>
      `,
    });

    logStep("Email sent successfully", { response: emailResponse });

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    logStep("ERROR", { message: error.message });
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
