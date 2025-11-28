import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface Answer {
  question_id: string;
  question_type: string;
  answer: string;
  time_spent_seconds: number;
}

interface RequestBody {
  candidateId: string;
  answers: Answer[];
}

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, answers }: RequestBody = await req.json();

    console.log('Received assessment submission:', { candidateId, answerCount: answers.length });

    // Validate input
    if (!candidateId || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: candidateId and answers are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate to verify it exists and get job info
    const { data: candidate, error: candidateError } = await supabase
      .from('candidates')
      .select('id, job_id, name, email, completed_test')
      .eq('id', candidateId)
      .single();

    if (candidateError || !candidate) {
      console.error('Candidate not found:', candidateError);
      return new Response(
        JSON.stringify({ error: 'Candidate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if already completed
    if (candidate.completed_test) {
      console.log('Assessment already completed for candidate:', candidateId);
      return new Response(
        JSON.stringify({ error: 'Assessment already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Fetch job questions for validation and scoring
    const { data: job, error: jobError } = await supabase
      .from('job_openings')
      .select('id, title, description, questions')
      .eq('id', candidate.job_id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Save answers to database
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        assessment_answers: answers,
        completed_test: true,
        test_completed_at: new Date().toISOString(),
      })
      .eq('id', candidateId);

    if (updateError) {
      console.error('Error updating candidate:', updateError);
      return new Response(
        JSON.stringify({ error: 'Failed to save assessment answers' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Assessment answers saved successfully for candidate:', candidateId);

    // Prepare payload for N8N scoring workflow
    const n8nWebhookUrl = Deno.env.get('TEST_SCORING_WEBHOOK_URL');
    
    if (n8nWebhookUrl) {
      try {
        const scoringPayload = {
          candidate: {
            id: candidate.id,
            name: candidate.name,
            email: candidate.email,
          },
          job: {
            id: job.id,
            title: job.title,
            description: job.description,
          },
          questions: job.questions,
          answers: answers,
          callback_url: `${supabaseUrl}/functions/v1/receive-test-scores`,
        };

        console.log('Sending to N8N for scoring:', { webhookUrl: n8nWebhookUrl });

        const n8nResponse = await fetch(n8nWebhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(scoringPayload),
        });

        if (!n8nResponse.ok) {
          console.error('N8N webhook call failed:', await n8nResponse.text());
        } else {
          console.log('Successfully sent to N8N for scoring');
        }
      } catch (n8nError) {
        console.error('Error calling N8N webhook:', n8nError);
        // Don't fail the request if N8N call fails
      }
    } else {
      console.log('TEST_SCORING_WEBHOOK_URL not configured, skipping N8N integration');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Assessment submitted successfully',
        candidateId: candidateId,
      }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in submit-assessment function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});