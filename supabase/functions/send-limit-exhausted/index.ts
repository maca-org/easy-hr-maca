import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LimitExhaustedRequest {
  userId: string;
  email: string;
  limit: number;
  planType: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, limit, planType }: LimitExhaustedRequest = await req.json();

    console.log(`Sending limit exhausted notification to ${email} - 0/${limit} credits remaining`);

    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://app.example.com";

    const emailResponse = await resend.emails.send({
      from: "CandidateAssess <no-reply@candidateassess.com>",
      to: [email],
      subject: `🚨 Your credits are exhausted - Upgrade now to continue`,
      html: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color: #f4f4f5; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table width="100%" cellpadding="0" cellspacing="0" style="max-width: 600px; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);">
          
          <!-- Header - Red/Urgent Theme -->
          <tr>
            <td style="background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                🚨 Credits Exhausted
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                You've used <strong>100%</strong> of your monthly credits on your <strong>${planType.charAt(0).toUpperCase() + planType.slice(1)}</strong> plan.
              </p>
              
              <!-- Progress Bar - Full Red -->
              <div style="background-color: #e5e7eb; border-radius: 8px; height: 12px; margin-bottom: 16px; overflow: hidden;">
                <div style="background: linear-gradient(90deg, #dc2626 0%, #991b1b 100%); height: 100%; width: 100%; border-radius: 8px;"></div>
              </div>
              
              <p style="margin: 0 0 8px; color: #dc2626; font-size: 14px; text-align: center;">
                <strong style="color: #dc2626; font-size: 24px;">0</strong> credits remaining
              </p>
              <p style="margin: 0 0 32px; color: #6b7280; font-size: 14px; text-align: center;">
                out of ${limit} monthly credits
              </p>
              
              <!-- Critical Warning Box -->
              <div style="background-color: #fef2f2; border-left: 4px solid #dc2626; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                <p style="margin: 0; color: #991b1b; font-size: 14px;">
                  <strong>⚠️ Action Required:</strong> You cannot unlock any more candidates until you upgrade your plan or wait for your next billing cycle.
                </p>
              </div>
              
              <!-- CTA Button - Urgent Red -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/subscription" style="display: inline-block; background: linear-gradient(135deg, #dc2626 0%, #991b1b 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Upgrade Immediately
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Plan Comparison -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600; text-align: center;">
                  Upgrade Options
                </p>
                <table width="100%" cellpadding="8" cellspacing="0" style="font-size: 12px; color: #6b7280;">
                  <tr style="background-color: #f9fafb;">
                    <td style="border-radius: 4px 0 0 4px;"><strong>Starter</strong></td>
                    <td>100 credits</td>
                    <td style="border-radius: 0 4px 4px 0;">$29/mo</td>
                  </tr>
                  <tr>
                    <td><strong>Pro</strong></td>
                    <td>250 credits</td>
                    <td>$79/mo</td>
                  </tr>
                  <tr style="background-color: #f9fafb;">
                    <td style="border-radius: 4px 0 0 4px;"><strong>Business</strong></td>
                    <td>1000 credits</td>
                    <td style="border-radius: 0 4px 4px 0;">$199/mo</td>
                  </tr>
                  <tr>
                    <td><strong>Enterprise</strong></td>
                    <td>Unlimited</td>
                    <td>Contact us</td>
                  </tr>
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #fef2f2; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #991b1b; font-size: 12px;">
                You received this email because you've exhausted all your monthly credits.
                <br>This is a one-time notification per billing cycle.
              </p>
              <p style="margin: 16px 0 0; color: #991b1b; font-size: 12px;">
                If you have any questions, contact us at 
                <a href="mailto:support@candidateassess.com" style="color: #6366f1;">support@candidateassess.com</a>
              </p>
            </td>
          </tr>
          
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
      `,
    });

    console.log("Limit exhausted email sent successfully:", emailResponse);

    // Update profile to mark exhausted notification as sent
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('profiles')
      .update({ limit_exhausted_sent: true })
      .eq('id', userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending limit exhausted notification:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
