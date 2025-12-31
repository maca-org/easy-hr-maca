import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface LimitWarningRequest {
  userId: string;
  email: string;
  remaining: number;
  limit: number;
  planType: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { userId, email, remaining, limit, planType }: LimitWarningRequest = await req.json();

    console.log(`Sending limit warning to ${email} - ${remaining}/${limit} credits remaining`);

    const usagePercentage = Math.round(((limit - remaining) / limit) * 100);
    const appUrl = Deno.env.get("SUPABASE_URL")?.replace(".supabase.co", ".lovable.app") || "https://app.example.com";

    const emailResponse = await resend.emails.send({
      from: "CandidateAssess <no-reply@candidateassess.com>",
      to: [email],
      subject: `⚠️ Credit limit almost reached - ${remaining} credits remaining`,
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
          
          <!-- Header -->
          <tr>
            <td style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 32px; text-align: center;">
              <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 600;">
                ⚠️ Credit Limit Warning
              </h1>
            </td>
          </tr>
          
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              <p style="margin: 0 0 24px; color: #374151; font-size: 16px; line-height: 1.6;">
                You've used <strong>${usagePercentage}%</strong> of your monthly credits on your <strong>${planType.charAt(0).toUpperCase() + planType.slice(1)}</strong> plan.
              </p>
              
              <!-- Progress Bar -->
              <div style="background-color: #e5e7eb; border-radius: 8px; height: 12px; margin-bottom: 16px; overflow: hidden;">
                <div style="background: ${usagePercentage >= 90 ? 'linear-gradient(90deg, #f59e0b 0%, #ef4444 100%)' : 'linear-gradient(90deg, #6366f1 0%, #8b5cf6 100%)'}; height: 100%; width: ${usagePercentage}%; border-radius: 8px;"></div>
              </div>
              
              <p style="margin: 0 0 8px; color: #6b7280; font-size: 14px; text-align: center;">
                <strong style="color: #374151; font-size: 24px;">${remaining}</strong> credits remaining
              </p>
              <p style="margin: 0 0 32px; color: #6b7280; font-size: 14px; text-align: center;">
                out of ${limit} monthly credits
              </p>
              
              <!-- Warning Box -->
              <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; border-radius: 0 8px 8px 0; margin-bottom: 32px;">
                <p style="margin: 0; color: #92400e; font-size: 14px;">
                  <strong>Running low on credits?</strong> Upgrade your plan to get more monthly credits and unlock premium features.
                </p>
              </div>
              
              <!-- CTA Button -->
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="center">
                    <a href="${appUrl}/subscription" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 600; font-size: 16px;">
                      Upgrade Now
                    </a>
                  </td>
                </tr>
              </table>
              
              <!-- Plan Comparison -->
              <div style="margin-top: 32px; padding-top: 24px; border-top: 1px solid #e5e7eb;">
                <p style="margin: 0 0 16px; color: #374151; font-size: 14px; font-weight: 600; text-align: center;">
                  Compare Plans
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
                </table>
              </div>
            </td>
          </tr>
          
          <!-- Footer -->
          <tr>
            <td style="background-color: #f9fafb; padding: 24px; text-align: center;">
              <p style="margin: 0; color: #9ca3af; font-size: 12px;">
                You received this email because you're approaching your monthly credit limit.
                <br>This is a one-time notification per billing cycle.
              </p>
              <p style="margin: 16px 0 0; color: #9ca3af; font-size: 12px;">
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

    console.log("Limit warning email sent successfully:", emailResponse);

    // Update profile to mark warning as sent
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    await supabase
      .from('profiles')
      .update({ limit_warning_sent: true })
      .eq('id', userId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("Error sending limit warning:", error);
    return new Response(
      JSON.stringify({ error: error.message }),
      {
        status: 500,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      }
    );
  }
});
