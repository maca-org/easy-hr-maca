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
    // Accept cv_url instead of cv_text (normalized flow)
    const { candidate_id, job_id, cv_url, cv_file_path, job_description, job_title } = await req.json();

    const CV_ANALYSIS_WEBHOOK_URL = Deno.env.get('CV_ANALYSIS_WEBHOOK_URL');
    if (!CV_ANALYSIS_WEBHOOK_URL) {
      throw new Error('CV_ANALYSIS_WEBHOOK_URL not configured');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callback_url = `${SUPABASE_URL}/functions/v1/receive-cv-analysis`;

    console.log('Sending CV to n8n for analysis:', {
      candidate_id,
      job_id,
      cv_url: cv_url ? 'provided' : 'missing',
      cv_file_path,
      job_description_length: job_description?.length || 0,
      callback_url
    });

    // Send cv_url to n8n - unified format for both manual upload and link apply
    const response = await fetch(CV_ANALYSIS_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        candidate_id,
        job_id,
        cv: '', // Empty - n8n will parse from cv_url
        cv_url,
        cv_file_path,
        job_description,
        job_title,
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
