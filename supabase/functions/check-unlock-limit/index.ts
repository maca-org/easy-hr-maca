/// <reference types="https://esm.sh/@supabase/functions-js/src/edge-runtime.d.ts" />
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan limits configuration
const PLAN_LIMITS: Record<string, number> = {
  free: 25,
  starter: 100,
  pro: 250,
  business: 1000,
  enterprise: Infinity
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking unlock limit for user: ${user.id}`);

    // Get user's profile with plan info
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('plan_type, monthly_unlocked_count, billing_period_start, limit_warning_sent')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Default values if profile doesn't exist or fields are null
    const planType = profile?.plan_type || 'free';
    const monthlyUnlockedCount = profile?.monthly_unlocked_count || 0;
    const billingPeriodStart = profile?.billing_period_start || new Date().toISOString();
    const limitWarningSent = profile?.limit_warning_sent || false;

    // Get plan limit
    const limit = PLAN_LIMITS[planType] ?? 0;
    const remaining = Math.max(0, limit - monthlyUnlockedCount);
    const canUnlock = remaining > 0;

    console.log(`User ${user.id}: plan=${planType}, used=${monthlyUnlockedCount}, limit=${limit}, remaining=${remaining}`);

    // Check if we should send a 90% warning email
    if (limit !== Infinity && limit > 0) {
      const usagePercentage = (monthlyUnlockedCount / limit) * 100;
      const shouldSendWarning = usagePercentage >= 90 && !limitWarningSent;

      if (shouldSendWarning && user.email) {
        console.log(`User ${user.id} reached 90% usage, sending warning email to ${user.email}`);
        
        // Send warning email as background task
        EdgeRuntime.waitUntil(
          fetch(`${supabaseUrl}/functions/v1/send-limit-warning`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${supabaseServiceKey}`,
            },
            body: JSON.stringify({
              userId: user.id,
              email: user.email,
              remaining,
              limit,
              planType,
            }),
          }).catch(err => console.error('Failed to send limit warning:', err))
        );
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        plan_type: planType,
        limit: limit === Infinity ? 'unlimited' : limit,
        used: monthlyUnlockedCount,
        remaining: limit === Infinity ? 'unlimited' : remaining,
        can_unlock: canUnlock || limit === Infinity,
        billing_period_start: billingPeriodStart
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: 'Internal server error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
