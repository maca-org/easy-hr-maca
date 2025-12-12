import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScorePayload {
  candidate_id: string;
  test_result: number; // Score from 0-100
  detailed_scores?: {
    question_id: string;
    score: number;
    is_correct?: boolean;
    feedback?: string;
  }[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload: ScorePayload = await req.json();

    console.log('Received test scores from N8N:', {
      candidate_id: payload.candidate_id,
      test_result: payload.test_result,
    });

    // Validate input
    if (!payload.candidate_id || typeof payload.test_result !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: candidate_id and test_result are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate score range
    if (payload.test_result < 0 || payload.test_result > 100) {
      return new Response(
        JSON.stringify({ error: 'test_result must be between 0 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update candidate with test results
    const updateData: any = {
      test_result: Math.round(payload.test_result),
    };

    // Store detailed scores if provided
    if (payload.detailed_scores) {
      updateData.test_detailed_scores = payload.detailed_scores;
    }

    const { data, error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', payload.candidate_id)
      .select()
      .single();

    if (error) {
      console.error('Error updating candidate with test scores:', error);
      return new Response(
        JSON.stringify({ error: 'Failed to update candidate scores', details: error.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully updated candidate test scores:', {
      candidate_id: payload.candidate_id,
      test_result: payload.test_result,
    });

    return new Response(
      JSON.stringify({
        success: true,
        message: 'Test scores updated successfully',
        candidate: data,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in receive-test-scores function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});