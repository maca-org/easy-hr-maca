import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SubscriptionEmailRequest {
  email: string;
  planName: string;
  previousPlan?: string;
  action: "upgraded" | "downgraded" | "cancelled" | "renewed" | "payment_failed";
}

const PLAN_DETAILS: Record<string, { name: string; price: number; limit: number }> = {
  free: { name: "Free", price: 0, limit: 25 },
  starter: { name: "Starter", price: 29, limit: 100 },
  pro: { name: "Pro", price: 79, limit: 250 },
  business: { name: "Business", price: 199, limit: 1000 },
};

const getEmailContent = (action: string, planName: string, previousPlan?: string) => {
  const plan = PLAN_DETAILS[planName] || PLAN_DETAILS.free;
  const prevPlan = previousPlan ? PLAN_DETAILS[previousPlan] : null;

  switch (action) {
    case "upgraded":
      return {
        subject: `🎉 Welcome to ${plan.name} Plan!`,
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
                <h1 style="color: white; font-size: 28px; margin: 0;">🎉 Congratulations!</h1>
                <p style="color: rgba(255,255,255,0.9); font-size: 16px; margin-top: 10px;">Your plan has been upgraded</p>
              </div>
              
              <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #18181b; font-size: 24px; margin: 0 0 20px;">Welcome to ${plan.name}!</h2>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                  Thank you for upgrading your subscription. You now have access to:
                </p>
                
                <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #71717a;">Monthly Credits</span>
                    <span style="color: #18181b; font-weight: 600;">${plan.limit} candidates</span>
                  </div>
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #71717a;">Monthly Price</span>
                    <span style="color: #18181b; font-weight: 600;">$${plan.price}/month</span>
                  </div>
                </div>
                
                <p style="color: #52525b; font-size: 14px; line-height: 1.6;">
                  Your new plan is now active and your credits have been updated. Start screening more candidates today!
                </p>
                
                <a href="https://candidateassess.com/jobs" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px;">
                  Go to Dashboard
                </a>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 30px;">
                © ${new Date().getFullYear()} Candidate Assess. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      };

    case "downgraded":
      return {
        subject: `Your plan has been changed to ${plan.name}`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #18181b; border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
                <h1 style="color: white; font-size: 28px; margin: 0;">Plan Changed</h1>
              </div>
              
              <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #18181b; font-size: 24px; margin: 0 0 20px;">Your subscription has been updated</h2>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                  Your plan has been changed to <strong>${plan.name}</strong>. Your new limits are now in effect.
                </p>
                
                <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <div style="display: flex; justify-content: space-between; margin-bottom: 12px;">
                    <span style="color: #71717a;">Monthly Credits</span>
                    <span style="color: #18181b; font-weight: 600;">${plan.limit} candidates</span>
                  </div>
                </div>
                
                <p style="color: #52525b; font-size: 14px; line-height: 1.6;">
                  We're sorry to see you downgrade. If you ever need more capacity, you can upgrade anytime.
                </p>
                
                <a href="https://candidateassess.com/settings/subscription" style="display: inline-block; background: #18181b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px;">
                  View Subscription
                </a>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 30px;">
                © ${new Date().getFullYear()} Candidate Assess. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      };

    case "cancelled":
      return {
        subject: "Your subscription has been cancelled",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #dc2626; border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
                <h1 style="color: white; font-size: 28px; margin: 0;">Subscription Cancelled</h1>
              </div>
              
              <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #18181b; font-size: 24px; margin: 0 0 20px;">We're sorry to see you go</h2>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                  Your subscription has been cancelled. You'll continue to have access until the end of your current billing period.
                </p>
                
                <p style="color: #52525b; font-size: 14px; line-height: 1.6; margin-top: 20px;">
                  After that, you'll be moved to our Free plan with ${PLAN_DETAILS.free.limit} candidates per month.
                </p>
                
                <p style="color: #52525b; font-size: 14px; line-height: 1.6;">
                  Changed your mind? You can resubscribe anytime!
                </p>
                
                <a href="https://candidateassess.com/settings/subscription" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px;">
                  Resubscribe Now
                </a>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 30px;">
                © ${new Date().getFullYear()} Candidate Assess. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      };

    case "payment_failed":
      return {
        subject: "⚠️ Payment Failed - Action Required",
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: #f59e0b; border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
                <h1 style="color: white; font-size: 28px; margin: 0;">⚠️ Payment Failed</h1>
              </div>
              
              <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #18181b; font-size: 24px; margin: 0 0 20px;">We couldn't process your payment</h2>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                  Your recent payment for Candidate Assess subscription could not be processed. This could be due to:
                </p>
                
                <ul style="color: #52525b; font-size: 14px; line-height: 1.8; margin: 20px 0;">
                  <li>Expired credit card</li>
                  <li>Insufficient funds</li>
                  <li>Card declined by your bank</li>
                </ul>
                
                <div style="background: #fef3c7; border-radius: 12px; padding: 16px; margin: 20px 0; border-left: 4px solid #f59e0b;">
                  <p style="color: #92400e; font-size: 14px; margin: 0; font-weight: 500;">
                    Please update your payment method within 7 days to avoid service interruption.
                  </p>
                </div>
                
                <a href="https://candidateassess.com/settings/subscription" style="display: inline-block; background: #f59e0b; color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px;">
                  Update Payment Method
                </a>
                
                <p style="color: #71717a; font-size: 14px; margin-top: 24px; line-height: 1.6;">
                  If you believe this is an error, please contact your bank or reply to this email for assistance.
                </p>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 30px;">
                © ${new Date().getFullYear()} Candidate Assess. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      };

    default:
      return {
        subject: `Your ${plan.name} subscription has been renewed`,
        html: `
          <!DOCTYPE html>
          <html>
          <head>
            <meta charset="utf-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
          </head>
          <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 0; background-color: #f4f4f5;">
            <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
              <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); border-radius: 16px 16px 0 0; padding: 40px 30px; text-align: center;">
                <h1 style="color: white; font-size: 28px; margin: 0;">✅ Subscription Renewed</h1>
              </div>
              
              <div style="background: white; border-radius: 0 0 16px 16px; padding: 40px 30px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);">
                <h2 style="color: #18181b; font-size: 24px; margin: 0 0 20px;">Thank you for staying with us!</h2>
                
                <p style="color: #52525b; font-size: 16px; line-height: 1.6;">
                  Your ${plan.name} subscription has been renewed. Your credits have been reset for the new billing period.
                </p>
                
                <div style="background: #f4f4f5; border-radius: 12px; padding: 20px; margin: 20px 0;">
                  <div style="display: flex; justify-content: space-between;">
                    <span style="color: #71717a;">Available Credits</span>
                    <span style="color: #18181b; font-weight: 600;">${plan.limit} candidates</span>
                  </div>
                </div>
                
                <a href="https://candidateassess.com/jobs" style="display: inline-block; background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; text-decoration: none; padding: 14px 28px; border-radius: 8px; font-weight: 600; margin-top: 20px;">
                  Continue Screening
                </a>
              </div>
              
              <p style="color: #a1a1aa; font-size: 12px; text-align: center; margin-top: 30px;">
                © ${new Date().getFullYear()} Candidate Assess. All rights reserved.
              </p>
            </div>
          </body>
          </html>
        `,
      };
  }
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { email, planName, previousPlan, action }: SubscriptionEmailRequest = await req.json();

    console.log(`[SUBSCRIPTION-EMAIL] Sending ${action} email to ${email} for plan ${planName}`);

    const { subject, html } = getEmailContent(action, planName, previousPlan);

    const emailResponse = await resend.emails.send({
      from: "Candidate Assess <onboarding@resend.dev>",
      to: [email],
      subject,
      html,
    });

    console.log("[SUBSCRIPTION-EMAIL] Email sent successfully:", emailResponse);

    return new Response(JSON.stringify({ success: true, data: emailResponse }), {
      status: 200,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (error: any) {
    console.error("[SUBSCRIPTION-EMAIL] Error:", error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
