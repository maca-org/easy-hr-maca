import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.38.4';
import { Resend } from 'https://esm.sh/resend@4.0.0';
import * as React from 'https://esm.sh/react@18.3.1';
import { renderAsync, Html, Head, Body, Container, Section, Heading, Text, Preview } from 'https://esm.sh/@react-email/components@0.0.22';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface ScorePayload {
  candidate_id: string;
  test_result: number;
  detailed_scores?: {
    question_id: string;
    score: number;
    is_correct?: boolean;
    feedback?: string;
  }[];
}

// Inline email template component
const ResultsReadyEmail = ({
  candidateName,
  jobTitle,
  companyName,
  testScore,
}: {
  candidateName: string;
  jobTitle: string;
  companyName: string;
  testScore: number;
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
  const scoreBox = {
    backgroundColor: '#EFF6FF',
    border: '2px solid #3B82F6',
    borderRadius: '12px',
    padding: '24px',
    margin: '24px 0',
    textAlign: 'center' as const,
  };
  const scoreLabel = {
    fontSize: '14px',
    fontWeight: '500',
    color: '#1E40AF',
    margin: '0 0 8px 0',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.05em',
  };
  const scoreValue = {
    fontSize: '48px',
    fontWeight: '700',
    color: '#1D4ED8',
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
    React.createElement(Preview, null, `Your assessment results for ${jobTitle} are ready`),
    React.createElement(Body, { style: main },
      React.createElement(Container, { style: container },
        React.createElement(Section, { style: header },
          React.createElement(Heading, { style: h1 }, companyName)
        ),
        React.createElement(Section, { style: content },
          React.createElement(Text, { style: { fontSize: '18px', fontWeight: '600', color: '#0F172A', marginBottom: '16px' } }, `Hi ${candidateName},`),
          React.createElement(Text, { style: paragraph },
            `Your assessment for the ${jobTitle} position has been reviewed.`
          ),
          React.createElement(Section, { style: scoreBox },
            React.createElement(Text, { style: scoreLabel }, 'Your Score'),
            React.createElement(Text, { style: scoreValue }, `${testScore}%`)
          ),
          React.createElement(Text, { style: paragraph },
            'Our hiring team has completed the evaluation of your assessment. Your application is now being considered along with other candidates.'
          ),
          React.createElement(Text, { style: paragraph },
            'If your profile matches our requirements, a member of our team will reach out to discuss the next steps in the interview process.'
          ),
          React.createElement(Text, { style: footerText },
            `Thank you for your interest in joining ${companyName}.\n\nBest regards,\n${companyName} Team`
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
    const payload: ScorePayload = await req.json();
    console.log('Received test scores from N8N:', {
      candidate_id: payload.candidate_id,
      test_result: payload.test_result,
    });

    if (!payload.candidate_id || typeof payload.test_result !== 'number') {
      return new Response(
        JSON.stringify({ error: 'Invalid payload: candidate_id and test_result are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (payload.test_result < 0 || payload.test_result > 100) {
      return new Response(
        JSON.stringify({ error: 'test_result must be between 0 and 100' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch candidate details
    const { data: candidate, error: fetchError } = await supabase
      .from('candidates')
      .select('id, name, email, job_id')
      .eq('id', payload.candidate_id)
      .single();

    if (fetchError || !candidate) {
      console.error('Candidate not found:', fetchError);
      return new Response(
        JSON.stringify({ error: 'Candidate not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Update candidate with test results
    const updateData: any = {
      test_result: Math.round(payload.test_result),
    };

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

    console.log('Successfully updated candidate test scores');

    // Fetch job details for email
    const { data: job } = await supabase
      .from('job_openings')
      .select('title, user_id')
      .eq('id', candidate.job_id)
      .single();

    // Get company name
    let companyName = 'The Company';
    if (job?.user_id) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_name')
        .eq('id', job.user_id)
        .single();
      if (profile?.company_name) {
        companyName = profile.company_name;
      }
    }

    // Send results notification email
    const resendApiKey = Deno.env.get('RESEND_API_KEY');
    if (resendApiKey && candidate.email) {
      try {
        const resend = new Resend(resendApiKey);
        const html = await renderAsync(
          React.createElement(ResultsReadyEmail, {
            candidateName: candidate.name,
            jobTitle: job?.title || 'the position',
            companyName: companyName,
            testScore: Math.round(payload.test_result),
          })
        );

        const { error: emailError } = await resend.emails.send({
          from: `${companyName} <onboarding@resend.dev>`,
          to: [candidate.email],
          subject: `Assessment Results - ${job?.title || 'Your Application'}`,
          html,
        });

        if (emailError) {
          console.error('Error sending results email:', emailError);
        } else {
          console.log('Results notification email sent to:', candidate.email);
        }
      } catch (emailErr) {
        console.error('Failed to send results email:', emailErr);
      }
    }

    return new Response(
      JSON.stringify({ success: true, message: 'Test scores updated successfully', candidate: data }),
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
