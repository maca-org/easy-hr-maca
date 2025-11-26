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

    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');
    if (!LOVABLE_API_KEY) {
      console.error('LOVABLE_API_KEY not configured');
      return new Response(
        JSON.stringify({ success: false, error: 'AI service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Analyzing CV with Lovable AI for candidate:', candidate_id);

    // Call Lovable AI with tool calling for structured output
    const aiResponse = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${LOVABLE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'google/gemini-2.5-flash',
        messages: [
          {
            role: 'system',
            content: 'You are an expert HR assistant that analyzes CVs and extracts structured information.'
          },
          {
            role: 'user',
            content: `Analyze this CV (base64 PDF) and compare it with the job description.

CV (base64): ${cv_base64}

Job Description: ${job_description}

Extract structured information and provide analysis.`
          }
        ],
        tools: [
          {
            type: 'function',
            function: {
              name: 'analyze_cv',
              description: 'Extract structured data from CV and analyze fit with job description',
              parameters: {
                type: 'object',
                properties: {
                  cv_text: {
                    type: 'string',
                    description: 'Full text extracted from the CV'
                  },
                  name: {
                    type: 'string',
                    description: 'Candidate full name'
                  },
                  email: {
                    type: 'string',
                    description: 'Candidate email address'
                  },
                  phone: {
                    type: 'string',
                    description: 'Candidate phone number'
                  },
                  title: {
                    type: 'string',
                    description: 'Current or most recent job title'
                  },
                  years_of_experience: {
                    type: 'number',
                    description: 'Total years of professional experience'
                  },
                  skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'List of skills mentioned in CV'
                  },
                  education: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        degree: { type: 'string' },
                        institution: { type: 'string' },
                        year: { type: 'string' }
                      }
                    },
                    description: 'Education history'
                  },
                  matching_skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Skills from CV that match job requirements'
                  },
                  missing_skills: {
                    type: 'array',
                    items: { type: 'string' },
                    description: 'Required skills not found in CV'
                  },
                  cv_score: {
                    type: 'number',
                    description: 'Overall compatibility score 0-100'
                  },
                  experience_relevance: {
                    type: 'string',
                    description: 'Summary of how experience aligns with job'
                  },
                  improvement_categories: {
                    type: 'array',
                    items: {
                      type: 'object',
                      properties: {
                        category: { type: 'string' },
                        tips: {
                          type: 'array',
                          items: { type: 'string' }
                        }
                      }
                    },
                    description: 'Improvement suggestions by category'
                  }
                },
                required: [
                  'cv_text', 'name', 'email', 'title', 'years_of_experience',
                  'skills', 'matching_skills', 'missing_skills', 'cv_score',
                  'experience_relevance', 'improvement_categories'
                ]
              }
            }
          }
        ],
        tool_choice: { type: 'function', function: { name: 'analyze_cv' } }
      })
    });

    if (!aiResponse.ok) {
      const errorText = await aiResponse.text();
      console.error('Lovable AI error:', aiResponse.status, errorText);
      
      if (aiResponse.status === 429) {
        return new Response(
          JSON.stringify({ success: false, error: 'Rate limit exceeded. Please try again later.' }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      
      if (aiResponse.status === 402) {
        return new Response(
          JSON.stringify({ success: false, error: 'AI credits depleted. Please add funds to continue.' }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      return new Response(
        JSON.stringify({ success: false, error: 'Failed to analyze CV with AI' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const aiData = await aiResponse.json();
    const toolCall = aiData.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall || !toolCall.function?.arguments) {
      console.error('No tool call in AI response');
      return new Response(
        JSON.stringify({ success: false, error: 'Invalid AI response format' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const analysis = JSON.parse(toolCall.function.arguments);
    console.log('AI analysis complete, score:', analysis.cv_score);

    // Initialize Supabase client
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Update candidate record with analysis results
    const { error: updateError } = await supabase
      .from('candidates')
      .update({
        cv_text: analysis.cv_text,
        name: analysis.name,
        email: analysis.email,
        phone: analysis.phone || null,
        title: analysis.title,
        extracted_data: {
          years_of_experience: analysis.years_of_experience,
          skills: analysis.skills,
          education: analysis.education
        },
        relevance_analysis: {
          matching_skills: analysis.matching_skills,
          missing_skills: analysis.missing_skills,
          experience_relevance: analysis.experience_relevance
        },
        improvement_tips: analysis.improvement_categories,
        cv_rate: analysis.cv_score,
        updated_at: new Date().toISOString()
      })
      .eq('id', candidate_id);

    if (updateError) {
      console.error('Database update error:', updateError);
      return new Response(
        JSON.stringify({ success: false, error: 'Failed to save analysis results' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('CV analysis saved successfully for candidate:', candidate_id);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'CV analyzed successfully',
        candidate_id,
        cv_score: analysis.cv_score
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Error in analyze-cv-with-ai function:', error);
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
