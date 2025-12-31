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

interface UnlockRequest {
  candidate_id: string;
}

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

    // Parse request body
    const { candidate_id }: UnlockRequest = await req.json();
    
    if (!candidate_id) {
      return new Response(
        JSON.stringify({ error: 'candidate_id is required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`Unlock request: user=${user.id}, candidate=${candidate_id}`);

    // Check if candidate exists and belongs to the user (using ADMIN client)
    const { data: candidate, error: candidateError } = await supabaseAdmin
      .from('candidates')
      .select('id, user_id, is_unlocked, name')
      .eq('id', candidate_id)
      .maybeSingle();

    if (candidateError || !candidate) {
      console.error('Candidate fetch error:', candidateError);
      return new Response(
        JSON.stringify({ error: 'Candidate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Verify ownership
    if (candidate.user_id !== user.id) {
      return new Response(
        JSON.stringify({ error: 'Access denied' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already unlocked
    if (candidate.is_unlocked) {
      return new Response(
        JSON.stringify({ 
          success: true, 
          message: 'Candidate already unlocked',
          already_unlocked: true 
        }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get user's profile with plan info (using ADMIN client)
    const { data: profile, error: profileError } = await supabaseAdmin
      .from('profiles')
      .select('plan_type, monthly_unlocked_count')
      .eq('id', user.id)
      .maybeSingle();

    if (profileError) {
      console.error('Profile fetch error:', profileError);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch profile' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const planType = profile?.plan_type || 'free';
    const monthlyUnlockedCount = profile?.monthly_unlocked_count || 0;
    const limit = PLAN_LIMITS[planType] ?? 0;

    // Check if user can unlock
    if (limit !== Infinity && monthlyUnlockedCount >= limit) {
      console.log(`User ${user.id} hit unlock limit: ${monthlyUnlockedCount}/${limit}`);
      return new Response(
        JSON.stringify({ 
          error: 'Monthly unlock limit reached',
          limit_reached: true,
          plan_type: planType,
          used: monthlyUnlockedCount,
          limit: limit
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Unlock the candidate (using ADMIN client)
    const { error: updateCandidateError } = await supabaseAdmin
      .from('candidates')
      .update({
        is_unlocked: true,
        unlocked_at: new Date().toISOString(),
        unlocked_by: user.id
      })
      .eq('id', candidate_id);

    if (updateCandidateError) {
      console.error('Candidate update error:', updateCandidateError);
      return new Response(
        JSON.stringify({ error: 'Failed to unlock candidate' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Increment user's monthly unlock count (using ADMIN client)
    const { error: updateProfileError } = await supabaseAdmin
      .from('profiles')
      .update({
        monthly_unlocked_count: monthlyUnlockedCount + 1
      })
      .eq('id', user.id);

    if (updateProfileError) {
      console.error('Profile update error:', updateProfileError);
      // Don't fail the request, candidate is already unlocked
    }

    const newUsedCount = monthlyUnlockedCount + 1;
    const remaining = limit === Infinity ? 'unlimited' : Math.max(0, limit - newUsedCount);

    console.log(`Successfully unlocked candidate ${candidate_id} for user ${user.id}. Used: ${newUsedCount}/${limit}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Candidate ${candidate.name} unlocked successfully`,
        used: newUsedCount,
        remaining: remaining,
        limit: limit === Infinity ? 'unlimited' : limit
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
