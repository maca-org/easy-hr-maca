import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import Stripe from "https://esm.sh/stripe@18.5.0";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Product ID to plan type mapping
const PRODUCT_TO_PLAN: Record<string, string> = {
  "prod_TdFLxMXoLZz7Z2": "starter",
  "prod_TdFMnZ5uodu0Jg": "pro",
  "prod_TdFMrO1pIDrzBs": "business",
};

const logStep = (step: string, details?: unknown) => {
  const detailsStr = details ? ` - ${JSON.stringify(details)}` : '';
  console.log(`[CHECK-SUBSCRIPTION] ${step}${detailsStr}`);
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const supabaseClient = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    { auth: { persistSession: false } }
  );

  try {
    logStep("Function started");

    const stripeKey = Deno.env.get("STRIPE_SECRET_KEY");
    if (!stripeKey) throw new Error("STRIPE_SECRET_KEY is not set");
    logStep("Stripe key verified");

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("No authorization header provided");
    logStep("Authorization header found");

    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: userError } = await supabaseClient.auth.getUser(token);
    if (userError) throw new Error(`Authentication error: ${userError.message}`);
    const user = userData.user;
    if (!user?.email) throw new Error("User not authenticated or email not available");
    logStep("User authenticated", { userId: user.id, email: user.email });

    const stripe = new Stripe(stripeKey, { apiVersion: "2025-08-27.basil" });
    const customers = await stripe.customers.list({ email: user.email, limit: 1 });

    if (customers.data.length === 0) {
      logStep("No customer found, returning free plan");
      return new Response(JSON.stringify({ 
        subscribed: false, 
        plan_type: "free",
        subscription_end: null 
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      });
    }

    const customerId = customers.data[0].id;
    logStep("Found Stripe customer", { customerId });

    const subscriptions = await stripe.subscriptions.list({
      customer: customerId,
      status: "active",
      limit: 1,
    });

    const hasActiveSub = subscriptions.data.length > 0;
    let planType = "free";
    let subscriptionEnd: string | null = null;
    let stripeSubscriptionId: string | null = null;

    if (hasActiveSub) {
      const subscription = subscriptions.data[0];
      subscriptionEnd = new Date(subscription.current_period_end * 1000).toISOString();
      stripeSubscriptionId = subscription.id;
      
      const productId = subscription.items.data[0].price.product as string;
      planType = PRODUCT_TO_PLAN[productId] || "free";
      
      logStep("Active subscription found", { 
        subscriptionId: subscription.id, 
        endDate: subscriptionEnd,
        productId,
        planType 
      });

      // Update the user's profile with subscription info
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          plan_type: planType,
          stripe_customer_id: customerId,
          stripe_subscription_id: stripeSubscriptionId,
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Warning: Failed to update profile", { error: updateError.message });
      } else {
        logStep("Profile updated with subscription info");
      }
    } else {
      logStep("No active subscription found");
      
      // Update profile to free plan if no active subscription
      const { error: updateError } = await supabaseClient
        .from('profiles')
        .update({
          plan_type: 'free',
          stripe_customer_id: customerId,
          stripe_subscription_id: null,
        })
        .eq('id', user.id);

      if (updateError) {
        logStep("Warning: Failed to update profile to free", { error: updateError.message });
      }
    }

    return new Response(JSON.stringify({
      subscribed: hasActiveSub,
      plan_type: planType,
      subscription_end: subscriptionEnd,
    }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 200,
    });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    logStep("ERROR in check-subscription", { message: errorMessage });
    return new Response(JSON.stringify({ error: errorMessage }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 500,
    });
  }
});
