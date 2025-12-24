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
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MAX_NAME_LENGTH = 100;
const MAX_EMAIL_LENGTH = 255;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const ALLOWED_FILE_TYPES = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];

const sanitizeText = (text: string): string => {
  return text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/[<>"'&]/g, '') // Remove potentially dangerous chars
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
    const formData = await req.formData();
    const cvFile = formData.get('cv') as File;
    const jobIdentifier = formData.get('job_id') as string; // Can be UUID or slug
    let candidateName = formData.get('name') as string || 'Unknown';
    const candidateEmail = formData.get('email') as string;

    console.log('Public application received:', {
      jobIdentifier,
      candidateName,
      candidateEmail,
      fileName: cvFile?.name,
      fileSize: cvFile?.size,
      clientIP
    });

    // Validate required fields
    if (!cvFile || !jobIdentifier || !candidateEmail) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields: cv, job_id, or email' }),
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

    // Validate email
    if (!EMAIL_REGEX.test(candidateEmail) || candidateEmail.length > MAX_EMAIL_LENGTH) {
      return new Response(
        JSON.stringify({ error: 'Invalid email address' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Sanitize and validate name
    candidateName = sanitizeText(candidateName).substring(0, MAX_NAME_LENGTH);
    if (!candidateName) {
      candidateName = 'Unknown';
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

    const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!;
    const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

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
    const cvText = await cvFile.text().catch(() => '');

    // 5. Create candidate record (use actual job.id UUID)
    const candidateId = crypto.randomUUID();
    
    const { error: candidateError } = await supabase
      .from('candidates')
      .insert({
        id: candidateId,
        job_id: job.id, // Always use the resolved UUID
        user_id: job.user_id,
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

    console.log('Candidate created:', candidateId);

    // 6. Trigger CV analysis with signed URL
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
            job_id: job.id, // Always use resolved UUID
            cv: cvText, // Backward compatibility
            cv_url: cvSignedUrl, // New: signed URL for proper PDF extraction
            cv_file_path: uploadData.path, // Storage path
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
