import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const formData = await req.formData();
    const cvFile = formData.get('cv') as File;
    const jobId = formData.get('job_id') as string;
    const candidateName = formData.get('name') as string || 'Unknown';
    const candidateEmail = formData.get('email') as string;

    console.log('Public application received:', {
      jobId,
      candidateName,
      candidateEmail,
      fileName: cvFile?.name,
      fileSize: cvFile?.size
    });

    if (!cvFile || !jobId || !candidateEmail) {
      throw new Error('Missing required fields: cv, job_id, or email');
    }

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    // 1. Get job details
    const { data: job, error: jobError } = await supabase
      .from('job_openings')
      .select('id, title, description, user_id')
      .eq('id', jobId)
      .single();

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      throw new Error('Job opening not found');
    }

    console.log('Found job:', job.title);

    // 2. Upload CV to storage
    const fileExt = cvFile.name.split('.').pop();
    const fileName = `${jobId}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
    
    const arrayBuffer = await cvFile.arrayBuffer();
    const fileBytes = new Uint8Array(arrayBuffer);

    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('cvs')
      .upload(fileName, fileBytes, {
        contentType: cvFile.type,
        upsert: false
      });

    if (uploadError) {
      console.error('Upload error:', uploadError);
      throw new Error('Failed to upload CV');
    }

    console.log('CV uploaded:', uploadData.path);

    // 3. Extract text from CV (basic for now - the analyze-cv will do the heavy lifting)
    const cvText = await cvFile.text().catch(() => '');

    // 4. Check if user can auto-unlock this candidate
    let shouldAutoUnlock = false;
    try {
      // Get user's profile with plan info
      const { data: profile } = await supabase
        .from('profiles')
        .select('plan_type, monthly_unlocked_count')
        .eq('id', job.user_id)
        .maybeSingle();

      if (profile) {
        const PLAN_LIMITS: Record<string, number> = {
          free: 25,
          starter: 100,
          pro: 250,
          business: 1000,
          enterprise: Infinity
        };
        const planType = profile.plan_type || 'free';
        const limit = PLAN_LIMITS[planType] ?? 25;
        const used = profile.monthly_unlocked_count || 0;
        
        if (used < limit) {
          shouldAutoUnlock = true;
          // Increment the monthly count
          await supabase
            .from('profiles')
            .update({ monthly_unlocked_count: used + 1 })
            .eq('id', job.user_id);
        }
      }
    } catch (e) {
      console.log('Could not check unlock limit, defaulting to locked');
    }

    // 5. Create candidate record
    const candidateId = crypto.randomUUID();
    
    const { error: candidateError } = await supabase
      .from('candidates')
      .insert({
        id: candidateId,
        job_id: jobId,
        user_id: job.user_id,
        name: candidateName,
        email: candidateEmail,
        cv_file_path: uploadData.path,
        cv_text: cvText,
        cv_rate: 0,
        application_source: 'link_applied',
        applied_at: new Date().toISOString(),
        is_unlocked: shouldAutoUnlock
      });

    if (candidateError) {
      console.error('Candidate insert error:', candidateError);
      throw new Error('Failed to create candidate record');
    }

    console.log('Candidate created:', candidateId, 'Auto-unlocked:', shouldAutoUnlock);

    // 5. Trigger CV analysis
    const CV_ANALYSIS_WEBHOOK_URL = Deno.env.get('CV_ANALYSIS_WEBHOOK_URL');
    
    if (CV_ANALYSIS_WEBHOOK_URL) {
      const callback_url = `${SUPABASE_URL}/functions/v1/receive-cv-analysis`;
      
      console.log('Triggering CV analysis for candidate:', candidateId);
      
      try {
        const analysisResponse = await fetch(CV_ANALYSIS_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            candidate_id: candidateId,
            job_id: jobId,
            cv: cvText,
            job_description: job.description,
            job_title: job.title,
            callback_url
          }),
        });

        if (!analysisResponse.ok) {
          console.error('CV analysis trigger failed:', await analysisResponse.text());
        } else {
          console.log('CV analysis triggered successfully');
        }
      } catch (analysisError) {
        console.error('Error triggering CV analysis:', analysisError);
        // Don't fail the application if analysis fails
      }
    } else {
      console.log('CV_ANALYSIS_WEBHOOK_URL not configured, skipping analysis');
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Application submitted successfully',
        candidate_id: candidateId
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200 
      }
    );

  } catch (error) {
    console.error('Error in public-apply:', error);
    return new Response(
      JSON.stringify({ 
        error: error instanceof Error ? error.message : 'Unknown error' 
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 500 
      }
    );
  }
});
