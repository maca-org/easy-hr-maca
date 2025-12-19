import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
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

    console.log('Starting monthly count reset...');

    // Reset all users' monthly_unlocked_count to 0 and update billing_period_start
    const { data, error } = await supabase
      .from('profiles')
      .update({
        monthly_unlocked_count: 0,
        billing_period_start: new Date().toISOString()
      })
      .neq('monthly_unlocked_count', 0) // Only update users who have used their quota
      .select('id');

    if (error) {
      console.error('Reset error:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to reset monthly counts' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const resetCount = data?.length || 0;
    console.log(`Successfully reset monthly counts for ${resetCount} users`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Reset monthly counts for ${resetCount} users`,
        reset_count: resetCount,
        reset_at: new Date().toISOString()
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
