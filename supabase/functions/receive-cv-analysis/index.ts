import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received CV analysis from n8n:', payload);

    const { 
      candidate_id, 
      extracted_data, 
      relevance_analysis, 
      improvement_tips 
    } = payload;

    if (!candidate_id) {
      throw new Error('candidate_id is required');
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Prepare update object
    const updateData: any = {
      extracted_data,
      relevance_analysis,
      improvement_tips,
    };

    // Map relevance_analysis.overall_score to cv_rate
    if (relevance_analysis?.overall_score !== undefined) {
      updateData.cv_rate = relevance_analysis.overall_score;
    }

    // Map matching/missing skills to insights
    if (relevance_analysis?.matching_skills || relevance_analysis?.missing_skills) {
      updateData.insights = {
        matching: relevance_analysis.matching_skills || [],
        not_matching: relevance_analysis.missing_skills || []
      };
    }

    // Update name, email, phone, title from extracted_data if available
    if (extracted_data?.name) updateData.name = extracted_data.name;
    if (extracted_data?.email) updateData.email = extracted_data.email;
    if (extracted_data?.phone) updateData.phone = extracted_data.phone;
    if (extracted_data?.current_title) updateData.title = extracted_data.current_title;

    console.log('Updating candidate with data:', updateData);

    // Update candidate in database
    const { error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidate_id);

    if (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }

    console.log('Candidate updated successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'CV analysis saved' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in receive-cv-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
