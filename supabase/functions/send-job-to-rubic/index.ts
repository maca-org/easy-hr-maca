import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

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
    const { job_id, job_title, job_description } = await req.json();
    
    console.log(`[send-job-to-rubic] Received request for job_id: ${job_id}`);

    // Validation
    if (!job_id || !job_description) {
      console.error('[send-job-to-rubic] Missing required fields');
      return new Response(
        JSON.stringify({ error: 'job_id and job_description are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = Deno.env.get('RUBIC_JOB_DESC_WEBHOOK_URL');
    
    if (!webhookUrl) {
      console.error('[send-job-to-rubic] RUBIC_JOB_DESC_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ error: 'Webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Construct webhook payload
    const payload = {
      event: "job_desc_upserted",
      job: {
        id: job_id,
        job_title: job_title || '',
        job_description: job_description,
        source: "rubic",
        created_at: new Date().toISOString()
      }
    };

    console.log(`[send-job-to-rubic] Sending payload to webhook for job: ${job_id}`);

    // Retry logic with exponential backoff (3 attempts)
    let lastError: string = '';
    for (let attempt = 1; attempt <= 3; attempt++) {
      try {
        console.log(`[send-job-to-rubic] Attempt ${attempt} for job ${job_id}`);
        
        const response = await fetch(webhookUrl, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload)
        });
        
        if (response.ok) {
          console.log(`[send-job-to-rubic] Successfully sent webhook for job ${job_id}`);
          return new Response(
            JSON.stringify({ success: true, job_id, message: 'Webhook sent successfully' }),
            { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }
        
        lastError = `HTTP ${response.status}: ${await response.text()}`;
        console.warn(`[send-job-to-rubic] Attempt ${attempt} failed: ${lastError}`);
        
      } catch (err) {
        lastError = err instanceof Error ? err.message : String(err);
        console.warn(`[send-job-to-rubic] Attempt ${attempt} error: ${lastError}`);
      }
      
      // Wait before retry (exponential backoff: 2s, 4s)
      if (attempt < 3) {
        const waitTime = 1000 * Math.pow(2, attempt);
        console.log(`[send-job-to-rubic] Waiting ${waitTime}ms before retry`);
        await new Promise(r => setTimeout(r, waitTime));
      }
    }

    // All retries failed
    console.error(`[send-job-to-rubic] Failed after 3 attempts for job ${job_id}: ${lastError}`);
    return new Response(
      JSON.stringify({ error: `Failed after 3 attempts: ${lastError}`, job_id }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
    
  } catch (error) {
    console.error('[send-job-to-rubic] Unexpected error:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
