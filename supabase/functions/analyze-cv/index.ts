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
    const { candidate_id, job_id, cv_text, cv_url, cv_file_path, job_description, job_title } = await req.json();

    // Determine which webhook to use based on whether we have cv_text or cv_url
    const isTextBased = cv_text && cv_text.length > 0;
    
    const CV_ANALYSIS_TEXT_WEBHOOK_URL = Deno.env.get('CV_ANALYSIS_TEXT_WEBHOOK_URL');
    const CV_ANALYSIS_WEBHOOK_URL = Deno.env.get('CV_ANALYSIS_WEBHOOK_URL');
    
    const webhookUrl = isTextBased ? CV_ANALYSIS_TEXT_WEBHOOK_URL : CV_ANALYSIS_WEBHOOK_URL;
    
    if (!webhookUrl) {
      const missingEnv = isTextBased ? 'CV_ANALYSIS_TEXT_WEBHOOK_URL' : 'CV_ANALYSIS_WEBHOOK_URL';
      throw new Error(`${missingEnv} not configured`);
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL');
    const callback_url = `${SUPABASE_URL}/functions/v1/receive-cv-analysis`;

    console.log('Sending CV to n8n for analysis:', {
      candidate_id,
      job_id,
      mode: isTextBased ? 'TEXT_BASED (manual upload)' : 'URL_BASED (link apply)',
      cv_text_length: cv_text?.length || 0,
      cv_url: cv_url ? 'provided' : 'missing',
      cv_file_path,
      job_description_length: job_description?.length || 0,
      webhook: isTextBased ? 'CV_ANALYSIS_TEXT_WEBHOOK_URL' : 'CV_ANALYSIS_WEBHOOK_URL',
      callback_url
    });

    // Build payload based on the mode
    const payload = {
      candidate_id,
      job_id,
      cv: isTextBased ? cv_text : '', // Text for manual uploads
      cv_url: isTextBased ? '' : cv_url, // URL for link applies
      cv_file_path,
      job_description,
      job_title,
      callback_url
    };

    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('n8n webhook error:', response.status, errorText);
      throw new Error(`n8n webhook failed: ${response.status}`);
    }

    const result = await response.json();
    console.log('CV sent to n8n successfully:', result);

    return new Response(
      JSON.stringify({ success: true, message: 'CV analysis started', mode: isTextBased ? 'text' : 'url' }),
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
