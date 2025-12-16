import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";
import { Briefcase, Upload, FileText, CheckCircle, Clock, LogOut, User } from "lucide-react";
import * as pdfjsLib from "pdfjs-dist";
import PdfWorker from "pdfjs-dist/build/pdf.worker.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = PdfWorker;

interface Application {
  id: string;
  job_title: string | null;
  job_id: string;
  cv_rate: number;
  completed_test: boolean;
  test_result: number | null;
  created_at: string;
  applied_at: string | null;
  cv_file_path: string | null;
}

interface JobToApply {
  id: string;
  title: string;
  description: string;
  company_name: string | null;
}

export default function CandidatePortal() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const applyJobId = searchParams.get("apply");

  const [user, setUser] = useState<any>(null);
  const [applications, setApplications] = useState<Application[]>([]);
  const [jobToApply, setJobToApply] = useState<JobToApply | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate(`/candidate-auth?redirect=/candidate-portal${applyJobId ? `&apply=${applyJobId}` : ""}`);
        return;
      }
      setUser(session.user);
    };

    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === "SIGNED_OUT") {
        navigate("/candidate-auth");
      } else if (session) {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate, applyJobId]);

  const fetchApplications = useCallback(async () => {
    if (!user) return;

    const { data, error } = await supabase
      .from("candidates")
      .select(`
        id,
        job_id,
        cv_rate,
        completed_test,
        test_result,
        created_at,
        applied_at,
        cv_file_path,
        job_openings!inner(title)
      `)
      .eq("applicant_user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching applications:", error);
    } else {
      setApplications(
        (data || []).map((app: any) => ({
          ...app,
          job_title: app.job_openings?.title,
        }))
      );
    }
    setLoading(false);
  }, [user]);

  const fetchJobToApply = useCallback(async () => {
    if (!applyJobId) return;

    try {
      const { data, error } = await supabase.functions.invoke("get-public-job", {
        body: { job_id: applyJobId },
      });

      if (error) throw error;
      if (data && !data.error) {
        setJobToApply(data);
      }
    } catch (err) {
      console.error("Error fetching job:", err);
      toast.error("Failed to load job details");
    }
  }, [applyJobId]);

  useEffect(() => {
    if (user) {
      fetchApplications();
      fetchJobToApply();
    }
  }, [user, fetchApplications, fetchJobToApply]);

  const extractTextFromPdf = async (file: File): Promise<string> => {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let text = "";
    
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      text += textContent.items.map((item: any) => item.str).join(" ") + "\n";
    }
    
    return text;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user || !applyJobId || !jobToApply) return;

    if (file.type !== "application/pdf") {
      toast.error("Please upload a PDF file");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);

    try {
      // Extract text from PDF
      const cvText = await extractTextFromPdf(file);
      
      if (!cvText.trim()) {
        toast.error("Could not extract text from PDF");
        setUploading(false);
        return;
      }

      // Get job owner ID
      const { data: jobData, error: jobError } = await supabase
        .from("job_openings")
        .select("user_id")
        .eq("id", applyJobId)
        .single();

      if (jobError || !jobData) {
        toast.error("Job not found");
        setUploading(false);
        return;
      }

      // Create candidate record
      const candidateName = user.user_metadata?.full_name || user.email?.split("@")[0] || "Candidate";
      
      const { data: candidate, error: insertError } = await supabase
        .from("candidates")
        .insert({
          job_id: applyJobId,
          user_id: jobData.user_id, // Job owner's ID for HR to see
          applicant_user_id: user.id, // Candidate's own ID
          name: candidateName,
          email: user.email || "",
          cv_text: cvText,
          cv_rate: 0,
          application_source: "self_applied",
          applied_at: new Date().toISOString(),
        })
        .select()
        .single();

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error("Failed to submit application");
        setUploading(false);
        return;
      }

      // Trigger CV analysis
      const { error: analyzeError } = await supabase.functions.invoke("analyze-cv", {
        body: {
          candidate_id: candidate.id,
          job_id: applyJobId,
          cv_text: cvText,
          job_description: jobToApply.description,
          job_title: jobToApply.title,
        },
      });

      if (analyzeError) {
        console.error("Analysis error:", analyzeError);
        // Don't fail the application, just log the error
      }

      toast.success("Application submitted successfully!");
      setJobToApply(null);
      navigate("/candidate-portal", { replace: true });
      fetchApplications();
    } catch (err) {
      console.error("Upload error:", err);
      toast.error("Failed to process your resume");
    } finally {
      setUploading(false);
    }
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    navigate("/");
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Skeleton className="h-8 w-32" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      {/* Header */}
      <header className="border-b bg-background/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="h-6 w-6 text-primary" />
              <span className="font-bold text-xl">Candidate Portal</span>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <Button variant="outline" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-8 max-w-4xl">
        {/* Apply for Job Section */}
        {jobToApply && (
          <Card className="mb-8 border-primary/50 bg-primary/5">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Briefcase className="h-5 w-5" />
                Apply for: {jobToApply.title}
              </CardTitle>
              <CardDescription>
                {jobToApply.company_name && `at ${jobToApply.company_name} • `}
                Upload your resume to complete your application
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="border-2 border-dashed border-primary/30 rounded-lg p-8 text-center">
                <input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="cv-upload"
                  disabled={uploading}
                />
                <label htmlFor="cv-upload" className="cursor-pointer">
                  <div className="flex flex-col items-center gap-3">
                    {uploading ? (
                      <>
                        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary" />
                        <p className="text-sm text-muted-foreground">Processing your resume...</p>
                      </>
                    ) : (
                      <>
                        <Upload className="h-10 w-10 text-primary" />
                        <div>
                          <p className="font-medium text-foreground">Upload your Resume</p>
                          <p className="text-sm text-muted-foreground">PDF format, max 10MB</p>
                        </div>
                        <Button variant="secondary" size="sm">
                          Select File
                        </Button>
                      </>
                    )}
                  </div>
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Applications List */}
        <div>
          <h2 className="text-xl font-semibold mb-4">Your Applications</h2>
          
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          ) : applications.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">No applications yet</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Apply for jobs to see them here
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-4">
              {applications.map((app) => (
                <Card key={app.id}>
                  <CardContent className="py-4">
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium">{app.job_title || "Untitled Position"}</h3>
                        <p className="text-sm text-muted-foreground">
                          Applied {new Date(app.applied_at || app.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm text-muted-foreground">CV Match</p>
                          <p className="font-semibold">{app.cv_rate}%</p>
                        </div>
                        {app.completed_test ? (
                          <Badge variant="default" className="flex items-center gap-1">
                            <CheckCircle className="h-3 w-3" />
                            Test Completed
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            In Progress
                          </Badge>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
