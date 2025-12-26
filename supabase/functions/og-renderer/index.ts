import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

// Common crawler user agents
const CRAWLER_USER_AGENTS = [
  'WhatsApp',
  'facebookexternalhit',
  'Facebot',
  'Twitterbot',
  'LinkedInBot',
  'Slackbot',
  'TelegramBot',
  'Discordbot',
  'Googlebot',
  'bingbot',
  'Baiduspider',
]

function isCrawler(userAgent: string): boolean {
  if (!userAgent) return false
  return CRAWLER_USER_AGENTS.some(crawler => 
    userAgent.toLowerCase().includes(crawler.toLowerCase())
  )
}

function generateOGHtml(job: { title: string; description: string; id: string; slug?: string }, baseUrl: string): string {
  const jobTitle = job.title || 'Job Opening'
  const ogTitle = `Apply Now: ${jobTitle} | Candidate Assess`
  const ogDescription = `Submit your CV for ${jobTitle}. Apply now through Candidate Assess - AI-Powered Hiring Platform.`
  const ogImage = `${baseUrl}/og-image.png`
  const canonicalUrl = job.slug 
    ? `${baseUrl}/apply/${job.slug}` 
    : `${baseUrl}/apply/${job.id}`

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${ogTitle}</title>
  
  <!-- Open Graph / Facebook -->
  <meta property="og:type" content="website">
  <meta property="og:url" content="${canonicalUrl}">
  <meta property="og:title" content="${ogTitle}">
  <meta property="og:description" content="${ogDescription}">
  <meta property="og:image" content="${ogImage}">
  <meta property="og:site_name" content="Candidate Assess">
  <meta property="og:locale" content="en_US">
  
  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image">
  <meta name="twitter:url" content="${canonicalUrl}">
  <meta name="twitter:title" content="${ogTitle}">
  <meta name="twitter:description" content="${ogDescription}">
  <meta name="twitter:image" content="${ogImage}">
  
  <!-- Redirect non-crawlers to the actual page -->
  <meta http-equiv="refresh" content="0;url=${canonicalUrl}">
  
  <style>
    body { font-family: system-ui, sans-serif; padding: 40px; text-align: center; }
    h1 { color: #333; }
    p { color: #666; }
    a { color: #0066cc; }
  </style>
</head>
<body>
  <h1>${jobTitle}</h1>
  <p>Redirecting to application page...</p>
  <p><a href="${canonicalUrl}">Click here if not redirected</a></p>
</body>
</html>`
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const userAgent = req.headers.get('user-agent') || ''
    
    // Parse the job identifier from the request
    // Expected format: /og-renderer?job=<slug-or-id>
    const jobIdentifier = url.searchParams.get('job')
    
    if (!jobIdentifier) {
      console.error('No job identifier provided')
      return new Response(JSON.stringify({ error: 'Job identifier required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    console.log(`OG Renderer request for job: ${jobIdentifier}, User-Agent: ${userAgent}`)

    // Determine base URL
    const origin = req.headers.get('origin') || 'https://candidateassess.lovable.app'
    const baseUrl = origin.includes('localhost') ? origin : 'https://candidateassess.lovable.app'

    // Check if this is a crawler
    const crawlerDetected = isCrawler(userAgent)
    console.log(`Crawler detected: ${crawlerDetected}`)

    // If not a crawler, redirect to the actual page
    if (!crawlerDetected) {
      const redirectUrl = `${baseUrl}/apply/${jobIdentifier}`
      console.log(`Redirecting non-crawler to: ${redirectUrl}`)
      return new Response(null, {
        status: 302,
        headers: {
          ...corsHeaders,
          'Location': redirectUrl,
        },
      })
    }

    // For crawlers, fetch job info and return OG tags
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    // Try to find job by slug first, then by UUID
    const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(jobIdentifier)
    
    let query = supabase.from('job_openings').select('id, title, description, slug')
    
    if (isUUID) {
      query = query.eq('id', jobIdentifier)
    } else {
      query = query.eq('slug', jobIdentifier)
    }

    const { data: job, error } = await query.single()

    if (error || !job) {
      console.error('Job not found:', error?.message || 'No data')
      // Return generic OG tags if job not found
      const fallbackHtml = generateOGHtml(
        { title: 'Job Opening', description: 'Apply now at Candidate Assess', id: jobIdentifier },
        baseUrl
      )
      return new Response(fallbackHtml, {
        headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
      })
    }

    console.log(`Found job: ${job.title}`)

    // Generate and return OG HTML
    const ogHtml = generateOGHtml(job, baseUrl)
    
    return new Response(ogHtml, {
      headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' },
    })

  } catch (error) {
    console.error('Error in og-renderer:', error)
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
