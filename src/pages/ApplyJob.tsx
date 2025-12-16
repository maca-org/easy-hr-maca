import { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Briefcase, Building2, MapPin, Clock } from "lucide-react";
import { toast } from "sonner";

interface JobDetails {
  id: string;
  title: string;
  description: string;
  company_name: string | null;
  created_at: string;
}

export default function ApplyJob() {
  const { jobId } = useParams<{ jobId: string }>();
  const navigate = useNavigate();
  const [job, setJob] = useState<JobDetails | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) {
        setError("Job not found");
        setLoading(false);
        return;
      }

      try {
        const { data, error } = await supabase.functions.invoke("get-public-job", {
          body: { job_id: jobId },
        });

        if (error) throw error;
        if (!data || data.error) {
          setError(data?.error || "Job not found");
        } else {
          setJob(data);
        }
      } catch (err) {
        console.error("Error fetching job:", err);
        setError("Failed to load job details");
      } finally {
        setLoading(false);
      }
    };

    fetchJob();
  }, [jobId]);

  const handleApply = async () => {
    // Check if user is already logged in as a candidate
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
      // User is logged in, go directly to portal with job context
      navigate(`/candidate-portal?apply=${jobId}`);
    } else {
      // User needs to register/login first
      navigate(`/candidate-auth?redirect=/candidate-portal&apply=${jobId}`);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-2xl">
          <CardHeader>
            <Skeleton className="h-8 w-3/4 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent className="space-y-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-3/4" />
          </CardContent>
        </Card>
      </div>
    );
  }

  if (error || !job) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background flex items-center justify-center p-4">
        <Card className="w-full max-w-md text-center">
          <CardHeader>
            <CardTitle className="text-destructive">Job Not Found</CardTitle>
            <CardDescription>
              {error || "This job posting may have been removed or is no longer available."}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button variant="outline" onClick={() => navigate("/")}>
              Go to Homepage
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const formattedDate = new Date(job.created_at).toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center gap-2">
            <Briefcase className="h-6 w-6 text-primary" />
            <span className="font-bold text-xl">Job Application</span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-3xl">
        <Card className="overflow-hidden">
          {/* Job Header */}
          <div className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent p-6 border-b">
            <h1 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
              {job.title || "Untitled Position"}
            </h1>
            
            <div className="flex flex-wrap gap-4 text-muted-foreground text-sm">
              {job.company_name && (
                <div className="flex items-center gap-1.5">
                  <Building2 className="h-4 w-4" />
                  <span>{job.company_name}</span>
                </div>
              )}
              <div className="flex items-center gap-1.5">
                <Clock className="h-4 w-4" />
                <span>Posted {formattedDate}</span>
              </div>
            </div>
          </div>

          {/* Job Description */}
          <CardContent className="p-6">
            <h2 className="text-lg font-semibold mb-4">Job Description</h2>
            <div className="prose prose-sm max-w-none text-muted-foreground whitespace-pre-wrap">
              {job.description}
            </div>
          </CardContent>

          {/* Apply Section */}
          <div className="border-t bg-muted/30 p-6">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <p className="text-sm text-muted-foreground">
                  Ready to take the next step in your career?
                </p>
              </div>
              <Button size="lg" onClick={handleApply} className="w-full sm:w-auto">
                Apply Now
              </Button>
            </div>
          </div>
        </Card>

        {/* Additional Info */}
        <div className="mt-6 text-center text-sm text-muted-foreground">
          <p>By applying, you agree to share your resume with the hiring team.</p>
        </div>
      </main>
    </div>
  );
}
