import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Plan limits configuration - how many CVs can be analyzed per month
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
    const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    // Use ANON_KEY client for user authentication (properly validates tokens)
    const supabaseAuth = createClient(supabaseUrl, supabaseAnonKey);
    
    // Use SERVICE_ROLE_KEY client for database operations (bypasses RLS)
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);

    // Get authorization header
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Missing authorization header' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify the user with ANON client
    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabaseAuth.auth.getUser(token);
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid token' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Checking analysis credit for user: ${user.id}`);

    // Get user's profile with plan info (using ADMIN client)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_type, monthly_unlocked_count, billing_period_start')
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
    const monthlyAnalyzedCount = profile?.monthly_unlocked_count || 0;
    const billingPeriodStart = profile?.billing_period_start || new Date().toISOString();

    // Get plan limit
    const limit = PLAN_LIMITS[planType] ?? 25;
    const remaining = limit === Infinity ? Infinity : Math.max(0, limit - monthlyAnalyzedCount);
    const canAnalyze = remaining > 0 || limit === Infinity;

    console.log(`User ${user.id}: plan=${planType}, used=${monthlyAnalyzedCount}, limit=${limit}, remaining=${remaining}, canAnalyze=${canAnalyze}`);

    // If user can analyze, increment the count (using ADMIN client)
    if (canAnalyze) {
      const { error: updateError } = await supabaseAdmin
        .from('profiles')
        .update({
          monthly_unlocked_count: monthlyAnalyzedCount + 1
        })
        .eq('id', user.id);

      if (updateError) {
        console.error('Profile update error:', updateError);
        // Continue anyway - don't block the analysis
      }

      const newUsedCount = monthlyAnalyzedCount + 1;
      const newRemaining = limit === Infinity ? 'unlimited' : Math.max(0, limit - newUsedCount);

      return new Response(
        JSON.stringify({
          success: true,
          can_analyze: true,
          plan_type: planType,
          limit: limit === Infinity ? 'unlimited' : limit,
          used: newUsedCount,
          remaining: newRemaining,
          billing_period_start: billingPeriodStart
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // User has reached their limit
    console.log(`User ${user.id} has reached analysis limit: ${monthlyAnalyzedCount}/${limit}`);
    return new Response(
      JSON.stringify({
        success: true,
        can_analyze: false,
        limit_reached: true,
        plan_type: planType,
        limit: limit,
        used: monthlyAnalyzedCount,
        remaining: 0,
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
