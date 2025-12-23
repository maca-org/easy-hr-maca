import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const MAX_NAME_LENGTH = 100;
const MAX_PHONE_LENGTH = 30;
const MAX_TITLE_LENGTH = 150;
const MAX_EMAIL_LENGTH = 255;

const sanitizeText = (text: string, maxLength: number): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"']/g, '') // Remove potentially dangerous chars
    .trim()
    .substring(0, maxLength);
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const payload = await req.json();
    console.log('Received CV analysis from n8n:', payload);

    const { 
      candidate_id, 
      extracted_data, 
      relevance_analysis, 
      improvement_tips 
    } = payload;

    // Validate candidate_id
    if (!candidate_id || !UUID_REGEX.test(candidate_id)) {
      return new Response(
        JSON.stringify({ error: 'Invalid or missing candidate_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Initialize Supabase client with service role key
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Email validation regex
    const isValidEmail = (email: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);

    // Prepare update object
    const updateData: any = {
      extracted_data,
      relevance_analysis,
      improvement_tips,
    };

    // Map relevance_analysis.overall_score to cv_rate
    if (relevance_analysis?.overall_score !== undefined) {
      updateData.cv_rate = relevance_analysis.overall_score;
    }

    // Map matching/missing skills to insights
    if (relevance_analysis?.matching_skills || relevance_analysis?.missing_skills) {
      updateData.insights = {
        matching: relevance_analysis.matching_skills || [],
        not_matching: relevance_analysis.missing_skills || []
      };
    }

    // Update name, phone, title from extracted_data with sanitization
    if (extracted_data?.name) {
      updateData.name = sanitizeText(extracted_data.name, MAX_NAME_LENGTH);
    }
    if (extracted_data?.phone) {
      updateData.phone = sanitizeText(extracted_data.phone, MAX_PHONE_LENGTH);
    }
    if (extracted_data?.current_title) {
      updateData.title = sanitizeText(extracted_data.current_title, MAX_TITLE_LENGTH);
    }
    
    // Only update email if extracted email is valid (not auto-generated from filename)
    if (extracted_data?.email && isValidEmail(extracted_data.email) && !extracted_data.email.includes('@example.com')) {
      const sanitizedEmail = extracted_data.email.trim().substring(0, MAX_EMAIL_LENGTH);
      if (isValidEmail(sanitizedEmail)) {
        updateData.email = sanitizedEmail;
        console.log('Updating candidate email to:', sanitizedEmail);
      }
    }

    console.log('Updating candidate with data:', updateData);

    // Update candidate in database
    const { error } = await supabase
      .from('candidates')
      .update(updateData)
      .eq('id', candidate_id);

    if (error) {
      console.error('Error updating candidate:', error);
      throw error;
    }

    console.log('Candidate updated successfully');

    return new Response(
      JSON.stringify({ success: true, message: 'CV analysis saved' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in receive-cv-analysis:', error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
