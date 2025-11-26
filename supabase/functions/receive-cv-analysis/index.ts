import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.84.0';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      candidate_id, 
      cv_text,
      extracted_data, 
      relevance_analysis, 
      improvement_tips 
    } = await req.json();

    if (!candidate_id) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing candidate_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('Updating candidate with CV analysis:', candidate_id);

    // Update candidate with analysis results
    const { data, error } = await supabase
      .from('candidates')
      .update({
        cv_text,
        extracted_data,
        relevance_analysis,
        improvement_tips,
        cv_rate: relevance_analysis?.overall_score || 0,
        updated_at: new Date().toISOString()
      })
      .eq('id', candidate_id)
      .select()
      .single();

    if (error) {
      console.error('Database update error:', error);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to update candidate', details: error }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Candidate updated successfully:', candidate_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Candidate updated with CV analysis',
        data 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in receive-cv-analysis function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});