import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const logStep = (step: string, details?: any) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[STRIPE-WEBHOOK] ${step}${detailsStr}`);
};

const PRICE_TO_PLAN: Record<string, string> = {
  "price_1RWxwl2RnIpRZzPEDHR6rGBk": "starter",
  "price_1RWxxG2RnIpRZzPEcCKSPhFn": "pro",
  "price_1RWxxi2RnIpRZzPE2XJR6O2H": "business",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY") || "", { apiVersion: "2025-08-27.basil" });
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET");
  
  if (!webhookSecret) {
    logStep("ERROR: STRIPE_WEBHOOK_SECRET not configured");
    return new Response(JSON.stringify({ error: "Webhook secret not configured" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    const body = await req.text();
    const signature = req.headers.get("stripe-signature");

    if (!signature) {
      logStep("ERROR: No stripe signature");
      return new Response(JSON.stringify({ error: "No signature" }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let event: Stripe.Event;
    try {
      event = await stripe.webhooks.constructEventAsync(body, signature, webhookSecret);
    } catch (err: any) {
      logStep("Webhook signature verification failed", { error: err.message });
      return new Response(JSON.stringify({ error: `Webhook Error: ${err.message}` }), {
        status: 400,
        headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    logStep("Event received", { type: event.type, id: event.id });

    switch (event.type) {
      case "customer.subscription.deleted": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        logStep("Subscription deleted", { customerId, subscriptionId: subscription.id });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;

        if (email) {
          // Update database to free plan
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ 
              plan_type: "free",
              stripe_subscription_id: null,
              monthly_unlocked_count: 0,
              billing_period_start: new Date().toISOString()
            })
            .eq("email", email);

          if (updateError) {
            logStep("Error updating profile", { error: updateError.message });
          } else {
            logStep("Profile updated to free plan", { email });
          }

          // Record subscription history
          const { data: profile } = await supabase
            .from("profiles")
            .select("id")
            .eq("email", email)
            .single();

          if (profile) {
            await supabase.from("subscription_history").insert({
              user_id: profile.id,
              plan_type: "free",
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
              ended_at: new Date().toISOString(),
            });
          }

          // Send cancellation email
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              planName: "free",
              action: "cancelled",
            }),
          });
          logStep("Cancellation email sent", { email });
        }
        break;
      }

      case "customer.subscription.updated": {
        const subscription = event.data.object as Stripe.Subscription;
        const customerId = subscription.customer as string;
        const priceId = subscription.items.data[0]?.price?.id;
        const newPlan = PRICE_TO_PLAN[priceId] || "free";
        
        logStep("Subscription updated", { customerId, priceId, newPlan });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;

        if (email && subscription.status === "active") {
          // Get current plan to determine if upgrade or downgrade
          const { data: profile } = await supabase
            .from("profiles")
            .select("plan_type, id")
            .eq("email", email)
            .single();

          const previousPlan = profile?.plan_type || "free";
          const planOrder = { free: 0, starter: 1, pro: 2, business: 3 };
          const isUpgrade = planOrder[newPlan as keyof typeof planOrder] > planOrder[previousPlan as keyof typeof planOrder];
          const action = isUpgrade ? "upgraded" : "downgraded";

          // Update database
          const { error: updateError } = await supabase
            .from("profiles")
            .update({ 
              plan_type: newPlan,
              stripe_subscription_id: subscription.id,
              stripe_customer_id: customerId,
            })
            .eq("email", email);

          if (updateError) {
            logStep("Error updating profile", { error: updateError.message });
          } else {
            logStep("Profile updated", { email, newPlan });
          }

          // Record subscription history
          if (profile) {
            await supabase.from("subscription_history").insert({
              user_id: profile.id,
              plan_type: newPlan,
              stripe_customer_id: customerId,
              stripe_subscription_id: subscription.id,
            });
          }

          // Send email
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              planName: newPlan,
              previousPlan,
              action,
            }),
          });
          logStep(`${action} email sent`, { email });
        }
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        logStep("Payment failed", { customerId, invoiceId: invoice.id });

        // Get customer email
        const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
        const email = customer.email;

        if (email) {
          // Send payment failed email
          await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              email,
              planName: "current",
              action: "payment_failed",
            }),
          });
          logStep("Payment failed email sent", { email });
        }
        break;
      }

      case "invoice.payment_succeeded": {
        const invoice = event.data.object as Stripe.Invoice;
        const customerId = invoice.customer as string;
        const subscriptionId = invoice.subscription as string;
        
        // Check if this is a renewal (not initial payment)
        if (invoice.billing_reason === "subscription_cycle") {
          logStep("Subscription renewed", { customerId, invoiceId: invoice.id });

          // Get customer email
          const customer = await stripe.customers.retrieve(customerId) as Stripe.Customer;
          const email = customer.email;

          if (email) {
            // Get current plan
            const { data: profile } = await supabase
              .from("profiles")
              .select("plan_type")
              .eq("email", email)
              .single();

            const currentPlan = profile?.plan_type || "free";

            // Reset monthly credits and update billing period
            const { error: updateError } = await supabase
              .from("profiles")
              .update({ 
                monthly_unlocked_count: 0,
                billing_period_start: new Date().toISOString(),
                limit_warning_sent: false,
                limit_exhausted_sent: false,
              })
              .eq("email", email);

            if (updateError) {
              logStep("Error resetting credits", { error: updateError.message });
            } else {
              logStep("Credits reset for renewal", { email });
            }

            // Send renewal email
            await fetch(`${Deno.env.get("SUPABASE_URL")}/functions/v1/send-subscription-email`, {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                email,
                planName: currentPlan,
                action: "renewed",
              }),
            });
            logStep("Renewal email sent", { email });
          }
        }
        break;
      }

      default:
        logStep("Unhandled event type", { type: event.type });
    }

    return new Response(JSON.stringify({ received: true }), {
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
