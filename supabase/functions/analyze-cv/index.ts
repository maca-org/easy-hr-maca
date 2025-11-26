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
    const { candidate_id, job_id, cv_base64, job_description } = await req.json();

    if (!candidate_id || !job_id || !cv_base64 || !job_description) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Missing required fields: candidate_id, job_id, cv_base64, job_description' 
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const webhookUrl = Deno.env.get('CV_ANALYSIS_WEBHOOK_URL');
    if (!webhookUrl) {
      console.error('CV_ANALYSIS_WEBHOOK_URL not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'Webhook URL not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Sending CV to n8n for analysis:', { candidate_id, job_id });

    // Send to n8n webhook
    const n8nResponse = await fetch(webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        candidate_id,
        job_id,
        cv_base64,
        job_description
      })
    });

    if (!n8nResponse.ok) {
      const errorText = await n8nResponse.text();
      console.error('n8n webhook error:', n8nResponse.status, errorText);
      return new Response(
        JSON.stringify({ 
          success: false, 
          error: 'Failed to process CV with n8n',
          details: errorText 
        }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CV sent successfully to n8n for candidate:', candidate_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'CV analysis started',
        candidate_id 
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-cv function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});