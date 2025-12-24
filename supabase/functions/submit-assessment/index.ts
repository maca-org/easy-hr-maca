import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import * as React from 'https://esm.sh/react@18.3.1';
import { renderAsync, Html, Head, Body, Container, Section, Heading, Text, Preview } from 'https://esm.sh/@react-email/components@0.0.22';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting: candidateId -> { count, resetTime }
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();
const RATE_LIMIT = 3; // 3 submissions per minute per candidate
const RATE_WINDOW = 60 * 1000; // 1 minute in ms

function checkRateLimit(candidateId: string): boolean {
  const now = Date.now();
  const record = rateLimitMap.get(candidateId);

  if (!record || now > record.resetTime) {
    rateLimitMap.set(candidateId, { count: 1, resetTime: now + RATE_WINDOW });
    return true;
  }

  if (record.count >= RATE_LIMIT) {
    return false;
  }

  record.count++;
  return true;
}

// Cleanup old entries periodically
setInterval(() => {
  const now = Date.now();
  for (const [id, record] of rateLimitMap.entries()) {
    if (now > record.resetTime) {
      rateLimitMap.delete(id);
    }
  }
}, 60000);

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

// Inline email template component
const AssessmentSubmittedEmail = ({
  candidateName,
  jobTitle,
  companyName,
}: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
}) => {
  const main = {
    backgroundColor: '#f6f9fc',
    fontFamily: '-apple-system,BlinkMacSystemFont,"Segoe UI",Roboto,"Helvetica Neue",Ubuntu,sans-serif',
  };
  const container = {
    backgroundColor: '#ffffff',
    margin: '0 auto',
    padding: '20px 0 48px',
    marginBottom: '64px',
  };
  const header = {
    padding: '32px 24px',
    backgroundColor: '#0F172A',
  };
  const h1 = {
    color: '#ffffff',
    fontSize: '24px',
    fontWeight: '600',
    lineHeight: '32px',
    margin: '0',
    textAlign: 'center' as const,
  };
  const content = {
    padding: '0 48px',
  };
  const paragraph = {
    fontSize: '16px',
    lineHeight: '26px',
    color: '#334155',
    marginBottom: '16px',
  };
  const successBox = {
    backgroundColor: '#DCFCE7',
    border: '2px solid #22C55E',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
  };
  const successEmoji = {
    fontSize: '48px',
    margin: '0 0 8px 0',
    color: '#16A34A',
  };
  const successText = {
    fontSize: '20px',
    fontWeight: '700',
    color: '#166534',
    margin: '0',
  };
  const footerText = {
    fontSize: '14px',
    lineHeight: '24px',
    color: '#64748B',
    marginTop: '32px',
  };

  return React.createElement(Html, null,
    React.createElement(Head),
    React.createElement(Preview, null, `Your assessment for ${jobTitle} has been received`),
    React.createElement(Body, { style: main },
      React.createElement(Container, { style: container },
        React.createElement(Section, { style: header },
          React.createElement(Heading, { style: h1 }, companyName)
        ),
        React.createElement(Section, { style: content },
          React.createElement(Text, { style: { fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' } }, `Hi ${candidateName},`),
          React.createElement(Section, { style: successBox },
            React.createElement(Text, { style: successEmoji }, '✓'),
            React.createElement(Text, { style: successText }, 'Assessment Received!')
          ),
          React.createElement(Text, { style: paragraph },
            `Thank you for completing the assessment for the ${jobTitle} position at ${companyName}.`
          ),
          React.createElement(Text, { style: paragraph },
            'Your responses have been recorded and will be reviewed by our team. We appreciate the time and effort you put into this assessment.'
          ),
          React.createElement(Text, { style: footerText },
            `Best regards,\n${companyName} Team`
          )
        )
      )
    )
  );
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { candidateId, answers }: RequestBody = await req.json();
    console.log('Received assessment submission:', { candidateId, answerCount: answers.length });

    if (!candidateId || !answers || !Array.isArray(answers)) {
      return new Response(
        JSON.stringify({ error: 'Invalid request: candidateId and answers are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Rate limiting per candidateId
    if (!checkRateLimit(candidateId)) {
      console.warn(`Rate limit exceeded for candidate: ${candidateId}`);
      return new Response(
        JSON.stringify({ error: 'Too many submission attempts. Please try again later.' }),
        { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(candidateId)) {
      return new Response(
        JSON.stringify({ error: 'Invalid candidateId format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

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

    if (candidate.completed_test) {
      console.log('Assessment already completed for candidate:', candidateId);
      return new Response(
        JSON.stringify({ error: 'Assessment already completed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: job, error: jobError } = await supabase
      .from('job_openings')
      .select('id, title, description, questions, user_id')
      .eq('id', candidate.job_id)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    let companyName = 'The Company';
    if (job.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', job.user_id)
        .single();
      if (profile?.company_name) {
        companyName = profile.company_name;
      }
    }

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

    // Send confirmation email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && candidate.email) {
      try {
        const resend = new Resend(resendApiKey);
        const html = await renderAsync(
          React.createElement(AssessmentSubmittedEmail, {
            candidateName: candidate.name,
            jobTitle: job.title || 'the position',
            companyName: companyName,
          })
        );

        const { error: emailError } = await resend.emails.send({
          from: `${companyName} <onboarding@resend.dev>`,
          to: [candidate.email],
          subject: `Assessment Received - ${job.title || 'Application'}`,
          html,
        });

        if (emailError) {
          console.error('Error sending confirmation email:', emailError);
        } else {
          console.log('Confirmation email sent to:', candidate.email);
        }
      } catch (emailErr) {
        console.error('Failed to send confirmation email:', emailErr);
      }
    }

    // Send to N8N for scoring
    const n8nWebhookUrl = Deno.env.get('TEST_SCORING_WEBHOOK_URL');
    if (n8nWebhookUrl) {
      try {
        const scoringPayload = {
          candidate: { id: candidate.id, name: candidate.name, email: candidate.email },
          job: { id: job.id, title: job.title, description: job.description },
          questions: job.questions,
          answers: answers,
          callback_url: `${supabaseUrl}/functions/v1/receive-test-scores`,
        };
        console.log('Sending to N8N for scoring');
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
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Assessment submitted successfully', candidateId }),
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
