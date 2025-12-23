import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_QUESTION_LENGTH = 2000;
const MAX_OPTION_LENGTH = 500;
const MAX_QUESTIONS = 50;

const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '') // Remove script tags
    .replace(/<[^>]*>/g, '') // Remove other HTML tags
    .trim()
    .substring(0, MAX_QUESTION_LENGTH);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { job_id, mcq, open_questions } = await req.json();

    console.log('Received questions from n8n:', { 
      job_id, 
      mcq_type: typeof mcq,
      mcq_count: Array.isArray(mcq) ? mcq.length : 'not array',
      open_type: typeof open_questions,
      open_count: Array.isArray(open_questions) ? open_questions.length : 'not array'
    });

    // Validate job_id format
    if (!job_id || !UUID_REGEX.test(job_id)) {
      return new Response(
        JSON.stringify({ success: false, error: "Invalid or missing job_id" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse JSON strings if needed
    try {
      if (typeof mcq === 'string' && mcq.trim()) {
        console.log('Parsing mcq from string...');
        mcq = JSON.parse(mcq);
        console.log('mcq parsed successfully, count:', mcq.length);
      }
      if (typeof open_questions === 'string' && open_questions.trim()) {
        console.log('Parsing open_questions from string...');
        open_questions = JSON.parse(open_questions);
        console.log('open_questions parsed successfully, count:', open_questions.length);
      }
    } catch (parseError) {
      console.error('Error parsing question data:', parseError);
      return new Response(
        JSON.stringify({ success: false, error: "Invalid question format" }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch the job
    const { data: job, error: fetchError } = await supabase
      .from('job_openings')
      .select('*')
      .eq('id', job_id)
      .single();

    if (fetchError || !job) {
      console.error('Job not found:', fetchError);
      return new Response(
        JSON.stringify({ success: false, error: "Job not found" }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Transform n8n questions to our format
    const questions: Array<Record<string, any>> = [];

    // Add MCQ questions with validation and sanitization
    if (mcq && Array.isArray(mcq)) {
      const limitedMcq = mcq.slice(0, MAX_QUESTIONS);
      limitedMcq.forEach((q: any, idx: number) => {
        if (q.question && typeof q.question === 'string') {
          const sanitizedOptions = Array.isArray(q.options) 
            ? q.options.slice(0, 10).map((opt: any) => 
                typeof opt === 'string' ? sanitizeText(opt).substring(0, MAX_OPTION_LENGTH) : ''
              ).filter(Boolean)
            : [];
          
          questions.push({
            id: `mcq-${Date.now()}-${idx}`,
            type: 'mcq',
            question: sanitizeText(q.question),
            options: sanitizedOptions,
            correct_answer: typeof q.correct_answer === 'string' ? sanitizeText(q.correct_answer).substring(0, MAX_OPTION_LENGTH) : '',
            skill: typeof q.skill === 'string' ? sanitizeText(q.skill).substring(0, 100) : '',
            difficulty: typeof q.difficulty === 'string' ? sanitizeText(q.difficulty).substring(0, 20) : ''
          });
        }
      });
      console.log(`Added ${questions.filter(q => q.type === 'mcq').length} MCQ questions`);
    }

    // Add open questions with validation and sanitization
    if (open_questions && Array.isArray(open_questions)) {
      const limitedOpen = open_questions.slice(0, MAX_QUESTIONS);
      limitedOpen.forEach((q: any, idx: number) => {
        if (q.question && typeof q.question === 'string') {
          questions.push({
            id: `open-${Date.now()}-${idx}`,
            type: 'open',
            question: sanitizeText(q.question),
            skill: typeof q.skill === 'string' ? sanitizeText(q.skill).substring(0, 100) : ''
          });
        }
      });
      console.log(`Added ${questions.filter(q => q.type === 'open').length} open questions`);
    }

    console.log('Transformed questions:', { count: questions.length });

    // Update job with questions
    const { error: updateError } = await supabase
      .from('job_openings')
      .update({ questions })
      .eq('id', job_id);

    if (updateError) {
      console.error('Error updating job with questions:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: "Failed to update job" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Successfully saved questions to job:', job_id);

    return new Response(
      JSON.stringify({ success: true, questions_count: questions.length }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in receive-questions function:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(
      JSON.stringify({ success: false, error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
