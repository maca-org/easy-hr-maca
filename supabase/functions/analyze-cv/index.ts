import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidate_id, job_id, cv_text, job_description } = await req.json();

    const CV_ANALYSIS_WEBHOOK_URL = Deno.env.get('CV_ANALYSIS_WEBHOOK_URL');
    if (!CV_ANALYSIS_WEBHOOK_URL) {
      throw new Error('CV_ANALYSIS_WEBHOOK_URL not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callback_url = `${SUPABASE_URL}/functions/v1/receive-cv-analysis`;

    console.log('Sending CV to n8n for analysis:', {
      candidate_id,
      job_id,
      cv_text_length: cv_text?.length || 0,
      job_description_length: job_description?.length || 0,
      callback_url
    });

    const response = await fetch(CV_ANALYSIS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id,
        job_id,
        cv_text,
        job_description,
        callback_url
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('CV sent to n8n successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'CV analysis started' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in analyze-cv:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
