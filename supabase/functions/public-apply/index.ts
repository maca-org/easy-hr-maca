import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

// Rate limiting configuration
const RATE_LIMIT_WINDOW_MS = 60 * 1000; // 1 minute
const MAX_REQUESTS_PER_WINDOW = 5;
const rateLimitMap = new Map<string, { count: number; resetTime: number }>();

// Clean up old entries periodically
const cleanupRateLimitMap = () => {
  const now = Date.now();
  for (const [key, value] of rateLimitMap.entries()) {
    if (now > value.resetTime) {
      rateLimitMap.delete(key);
    }
  }
};

// Check rate limit for an IP
const checkRateLimit = (ip: string): { allowed: boolean; remaining: number; resetIn: number } => {
  cleanupRateLimitMap();
  
  const now = Date.now();
  const record = rateLimitMap.get(ip);
  
  if (!record || now > record.resetTime) {
    // New window
    rateLimitMap.set(ip, { count: 1, resetTime: now + RATE_LIMIT_WINDOW_MS });
    return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - 1, resetIn: RATE_LIMIT_WINDOW_MS };
  }
  
  if (record.count >= MAX_REQUESTS_PER_WINDOW) {
    return { allowed: false, remaining: 0, resetIn: record.resetTime - now };
  }
  
  record.count++;
  return { allowed: true, remaining: MAX_REQUESTS_PER_WINDOW - record.count, resetIn: record.resetTime - now };
};

// Validation helpers
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const SLUG_REGEX = /^[a-z0-9-]+$/i;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

// Sanitize text to remove NULL bytes and control characters that PostgreSQL can't handle
const sanitizeText = (text: string): string => {
  if (!text || typeof text !== 'string') return '';
  return text
    .replace(/\u0000/g, '') // Remove NULL bytes
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F]/g, '') // Remove control characters
    .trim();
};


serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  // Get client IP for rate limiting
  const clientIP = req.headers.get('x-forwarded-for')?.split(',')[0]?.trim() || 
                   req.headers.get('x-real-ip') || 
                   'unknown';
  
  // Check rate limit
  const rateLimitResult = checkRateLimit(clientIP);
  
  if (!rateLimitResult.allowed) {
    console.log(`Rate limit exceeded for IP: ${clientIP}`);
    return new Response(
      JSON.stringify({ 
        error: 'Too many requests. Please try again later.',
        retryAfter: Math.ceil(rateLimitResult.resetIn / 1000)
      }),
      { 
        status: 429, 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'Retry-After': Math.ceil(rateLimitResult.resetIn / 1000).toString(),
          'X-RateLimit-Remaining': '0',
          'X-RateLimit-Reset': Math.ceil(rateLimitResult.resetIn / 1000).toString()
        } 
      }
    );
  }

  try {
    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    const SUPABASE_ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!;
    
    // Verify the user is authenticated
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: 'Authentication required. Please login to apply.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create client with user's token to get their info
    const supabaseUser = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
      global: { headers: { Authorization: authHeader } }
    });

    const { data: { user }, error: userError } = await supabaseUser.auth.getUser();
    
    if (userError || !user) {
      console.error('Auth error:', userError);
      return new Response(
        JSON.stringify({ error: 'Invalid or expired session. Please login again.' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Authenticated user:', user.id, user.email);

    // Create admin client for database operations
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

    const formData = await req.formData();
    const cvFile = formData.get('cv') as File;
    const jobIdentifier = formData.get('job_id') as string;

    // Get name from user metadata or email
    let candidateName = user.user_metadata?.full_name || 
                        user.user_metadata?.name || 
                        user.email?.split('@')[0] || 
                        'Unknown';
    candidateName = sanitizeText(candidateName).substring(0, 100);

    const candidateEmail = user.email || '';

    console.log('Public application received:', {
      jobIdentifier,
      candidateName,
      candidateEmail,
      userId: user.id,
      fileName: cvFile?.name,
      fileSize: cvFile?.size,
      clientIP
    });

    // Validate required fields
    if (!cvFile || !jobIdentifier) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: cv or job_id' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate job identifier format (UUID or slug)
    const isUUID = UUID_REGEX.test(jobIdentifier);
    const isSlug = SLUG_REGEX.test(jobIdentifier);
    
    if (!isUUID && !isSlug) {
      return new Response(
        JSON.stringify({ error: 'Invalid job identifier format' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file size
    if (cvFile.size > MAX_FILE_SIZE) {
      return new Response(
        JSON.stringify({ error: 'File size exceeds 10MB limit' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate file type
    if (!ALLOWED_FILE_TYPES.includes(cvFile.type)) {
      return new Response(
        JSON.stringify({ error: 'Only PDF and Word documents are allowed' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 1. Get job details - support both UUID and slug
    let job;
    let jobError;

    if (isUUID) {
      const result = await supabase
        .from('job_openings')
        .select('id, title, description, user_id')
        .eq('id', jobIdentifier)
        .single();
      job = result.data;
      jobError = result.error;
    } else {
      // Search by slug
      const result = await supabase
        .from('job_openings')
        .select('id, title, description, user_id')
        .eq('slug', jobIdentifier)
        .single();
      job = result.data;
      jobError = result.error;
    }

    if (jobError || !job) {
      console.error('Job not found:', jobError);
      return new Response(
        JSON.stringify({ error: 'Job opening not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log('Found job:', job.title, 'with ID:', job.id);

    // Check if user already applied to this job
    const { data: existingApplication } = await supabase
      .from('candidates')
      .select('id')
      .eq('job_id', job.id)
      .eq('applicant_user_id', user.id)
      .single();

    if (existingApplication) {
      return new Response(
        JSON.stringify({ error: 'You have already applied to this job.' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // 2. Upload CV to storage (use actual job.id UUID)
    const fileExt = cvFile.name.split('.').pop();
    const fileName = `${job.id}/${Date.now()}_${crypto.randomUUID()}.${fileExt}`;
    
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

    // 3. Generate signed URL for CV analysis (valid for 1 hour)
    const { data: signedUrlData, error: signedUrlError } = await supabase.storage
      .from('cvs')
      .createSignedUrl(uploadData.path, 3600); // 1 hour

    if (signedUrlError) {
      console.error('Signed URL error:', signedUrlError);
    }

    const cvSignedUrl = signedUrlData?.signedUrl || '';

    // 4. Extract text from CV (basic fallback - webhook will do proper extraction)
    const rawCvText = await cvFile.text().catch(() => '');
    const cvText = sanitizeText(rawCvText);

    // 5. Create candidate record with authenticated user
    const candidateId = crypto.randomUUID();
    
    const { error: candidateError } = await supabase
      .from('candidates')
      .insert({
        id: candidateId,
        job_id: job.id,
        user_id: job.user_id, // Job owner
        applicant_user_id: user.id, // The applying candidate
        name: candidateName,
        email: candidateEmail,
        cv_file_path: uploadData.path,
        cv_text: cvText,
        cv_rate: 0,
        application_source: 'link_applied',
        applied_at: new Date().toISOString()
      });

    if (candidateError) {
      console.error('Candidate insert error:', candidateError);
      throw new Error('Failed to create candidate record');
    }

    console.log('Candidate created:', candidateId, 'for user:', user.id);

    // 6. Check employer's credit before triggering CV analysis
    const PLAN_LIMITS: Record<string, number> = {
      free: 25,
      starter: 100,
      pro: 250,
      business: 1000,
      enterprise: 999999
    };

    const { data: employerProfile, error: profileError } = await supabase
      .from('profiles')
      .select('plan_type, monthly_unlocked_count')
      .eq('id', job.user_id)
      .single();

    if (profileError) {
      console.error('Error fetching employer profile:', profileError);
    }

    const planType = employerProfile?.plan_type || 'free';
    const limit = PLAN_LIMITS[planType] ?? 25;
    const used = employerProfile?.monthly_unlocked_count || 0;
    const hasCredit = used < limit;

    console.log('Employer credit check:', { planType, used, limit, hasCredit, employerId: job.user_id });

    if (!hasCredit) {
      console.log('Employer has no credits remaining. CV will stay pending. Plan:', planType, 'Used:', used, 'Limit:', limit);
      // CV created but analysis NOT triggered - will stay pending until employer gets more credits
    } else {
      // Use 1 credit
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ monthly_unlocked_count: used + 1 })
        .eq('id', job.user_id);

      if (updateError) {
        console.error('Error updating credit count:', updateError);
      } else {
        console.log('Credit used. New count:', used + 1, '/', limit);
      }

      // 7. Trigger CV analysis with signed URL
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
              job_id: job.id,
              cv: cvText,
              cv_url: cvSignedUrl,
              cv_file_path: uploadData.path,
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
        }
      } else {
        console.log('CV_ANALYSIS_WEBHOOK_URL not configured, skipping analysis');
      }
    }

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: 'Application submitted successfully',
        candidate_id: candidateId
      }),
      { 
        headers: { 
          ...corsHeaders, 
          'Content-Type': 'application/json',
          'X-RateLimit-Remaining': rateLimitResult.remaining.toString()
        },
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