import { useState, useEffect, useCallback } from "react";
import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, CheckCircle, Loader2, FileText, Briefcase, LogOut, ClipboardList } from "lucide-react";
import { toast } from "sonner";
import DOMPurify from "dompurify";
import { supabase } from "@/integrations/supabase/client";
import CandidateAuth from "@/components/CandidateAuth";
import type { User, Session } from "@supabase/supabase-js";

interface JobOpening {
  id: string;
  title: string | null;
  description: string;
}

const JobApplication = () => {
  const { jobId } = useParams<{ jobId: string }>();
  const [job, setJob] = useState<JobOpening | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [dragActive, setDragActive] = useState(false);
  
  // Auth state
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [authChecked, setAuthChecked] = useState(false);

  // Set up auth state listener
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setSession(session);
        setUser(session?.user ?? null);
        setAuthChecked(true);
      }
    );

    // Check for existing session
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setUser(session?.user ?? null);
      setAuthChecked(true);
    });

    return () => subscription.unsubscribe();
  }, []);

  // Fetch job details
  useEffect(() => {
    const fetchJob = async () => {
      if (!jobId) return;

      try {
        const response = await fetch(
          `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-public-job`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ jobId }),
          }
        );

        const result = await response.json();

        if (!response.ok) {
          console.error("Error fetching job:", result.error);
          toast.error("Job opening not found");
        } else {
          setJob(result);
        }
      } catch (error) {
        console.error("Error fetching job:", error);
        toast.error("Failed to load job opening");
      }
      
      setLoading(false);
    };

    fetchJob();
  }, [jobId]);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type === "application/pdf") {
        setCvFile(file);
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  }, []);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.type === "application/pdf") {
        setCvFile(file);
      } else {
        toast.error("Please upload a PDF file");
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!cvFile || !job || !session) {
      toast.error("Please upload your CV");
      return;
    }

    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("cv", cvFile);
      formData.append("job_id", job.id);

      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/public-apply`,
        {
          method: "POST",
          headers: {
            "Authorization": `Bearer ${session.access_token}`,
          },
          body: formData,
        }
      );

      const result = await response.json();

      if (!response.ok) {
        if (response.status === 429) {
          const retryAfter = result.retryAfter || 60;
          throw new Error(`Too many requests. Please try again in ${retryAfter} seconds.`);
        }
        if (response.status === 404) {
          throw new Error("This job opening is no longer available.");
        }
        if (response.status === 401) {
          throw new Error("Please login to submit your application.");
        }
        throw new Error(result.error || "Failed to submit application");
      }

      setSubmitted(true);
      toast.success("Application submitted successfully!");
    } catch (error) {
      console.error("Submit error:", error);
      toast.error(error instanceof Error ? error.message : "Failed to submit application");
    } finally {
      setSubmitting(false);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    toast.info("Logged out");
  };

  if (loading || !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted">
        <Card className="w-full max-w-md mx-4">
          <CardContent className="pt-6 text-center">
            <Briefcase className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h1 className="text-xl font-semibold mb-2">Job Not Found</h1>
            <p className="text-muted-foreground">
              This job opening may no longer be available.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-muted p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-8 pb-8 text-center">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <CheckCircle className="w-10 h-10 text-green-600" />
            </div>
            <h1 className="text-2xl font-bold mb-3">Thank You!</h1>
            <p className="text-muted-foreground mb-2">
              Your CV has been submitted successfully.
            </p>
            <p className="text-sm text-muted-foreground mb-6">
              We will review your application and get back to you soon.
            </p>
            <Button asChild>
              <Link to="/my-applications">
                <ClipboardList className="w-4 h-4 mr-2" />
                View My Applications
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Show auth form if not logged in
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
        <div className="max-w-2xl mx-auto space-y-6">
          {/* Job Header */}
          <Card>
            <CardContent className="pt-6">
              <div className="text-center mb-4">
                <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                  <Briefcase className="w-10 h-10 text-primary" />
                </div>
                <h1 className="text-2xl font-bold">
                  {job.title || "Job Position"}
                </h1>
              </div>
              
              <div className="prose prose-sm max-w-none text-muted-foreground border-t pt-4">
                <h3 className="text-sm font-semibold text-foreground mb-2">Job Description</h3>
                <div 
                  className="whitespace-pre-wrap max-h-48 overflow-y-auto text-sm"
                  dangerouslySetInnerHTML={{ 
                    __html: DOMPurify.sanitize(job.description, {
                      ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'span', 'div'],
                      ALLOWED_ATTR: []
                    })
                  }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Auth Form */}
          <CandidateAuth 
            jobTitle={job.title || "this position"} 
            onAuthSuccess={() => {}} 
          />

          <p className="text-center text-xs text-muted-foreground">
            Powered by Lovable
          </p>
        </div>
      </div>
    );
  }

  // Show CV upload form for authenticated users
  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-8 px-4">
      <div className="max-w-2xl mx-auto space-y-6">
        {/* User Info Bar */}
        <div className="flex items-center justify-between bg-card rounded-lg px-4 py-3 border">
          <div className="text-sm">
            <span className="text-muted-foreground">Logged in as: </span>
            <span className="font-medium">{user.email}</span>
          </div>
          <Button variant="ghost" size="sm" onClick={handleLogout}>
            <LogOut className="w-4 h-4 mr-1" />
            Logout
          </Button>
        </div>

        {/* Job Header */}
        <Card>
          <CardContent className="pt-6">
            <div className="text-center mb-6">
              <div className="p-4 rounded-full bg-primary/10 w-fit mx-auto mb-4">
                <Briefcase className="w-10 h-10 text-primary" />
              </div>
              <h1 className="text-2xl font-bold">
                Apply for {job.title || "this position"}
              </h1>
            </div>
            
            <div className="prose prose-sm max-w-none text-muted-foreground border-t pt-4">
              <h3 className="text-sm font-semibold text-foreground mb-2">Job Description</h3>
              <div 
                className="whitespace-pre-wrap max-h-48 overflow-y-auto text-sm"
                dangerouslySetInnerHTML={{ 
                  __html: DOMPurify.sanitize(job.description, {
                    ALLOWED_TAGS: ['p', 'br', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'h3', 'h4', 'span', 'div'],
                    ALLOWED_ATTR: []
                  })
                }}
              />
            </div>
          </CardContent>
        </Card>

        {/* CV Upload Form */}
        <Card>
          <CardContent className="pt-6">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
              <Upload className="w-5 h-5 text-primary" />
              Upload Your CV
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">
              {/* CV Upload Area */}
              <div
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                className={`
                  relative border-2 border-dashed rounded-lg p-8 text-center transition-all cursor-pointer
                  ${dragActive 
                    ? "border-primary bg-primary/5" 
                    : cvFile 
                      ? "border-green-500 bg-green-50" 
                      : "border-muted-foreground/30 hover:border-primary/50"
                  }
                `}
              >
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                
                {cvFile ? (
                  <div className="flex flex-col items-center gap-2">
                    <FileText className="w-10 h-10 text-green-600" />
                    <p className="font-medium text-green-700">{cvFile.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Click or drag to replace
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="w-10 h-10 text-muted-foreground" />
                    <p className="font-medium">Drag & drop your CV here</p>
                    <p className="text-sm text-muted-foreground">
                      or click to browse (PDF only)
                    </p>
                  </div>
                )}
              </div>

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={submitting || !cvFile}
              >
                {submitting ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  "Submit Application"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Footer */}
        <p className="text-center text-xs text-muted-foreground">
          Powered by Lovable
        </p>
      </div>
    </div>
  );
};

export default JobApplication;