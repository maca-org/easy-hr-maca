import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthHeader from "@/components/AuthHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ChevronDown, ArrowLeft, RefreshCw, Upload } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Breadcrumb, BreadcrumbItem, BreadcrumbLink, BreadcrumbList, BreadcrumbPage, BreadcrumbSeparator } from "@/components/ui/breadcrumb";
import { JobSidebar } from "@/components/JobSidebar";
import { Job } from "./Index";
import { toast } from "sonner";
import { format } from "date-fns";
interface Candidate {
  id: string;
  name: string;
  title: string | null;
  email: string;
  phone: string | null;
  cv_rate: number;
  test_result: number | null;
  ai_interview_score: number | null;
  completed_test: boolean;
  created_at: string;
  insights: {
    matching: string[];
    not_matching: string[];
  };
}
export default function CandidatesDashboard() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("id");
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");
  const [jobs, setJobs] = useState<Job[]>([]);
  const [user, setUser] = useState<any>(null);
  const [expandedCandidateId, setExpandedCandidateId] = useState<string | null>(null);
  const [generatingQuestions, setGeneratingQuestions] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [sortBy, setSortBy] = useState<"score" | "name" | "date">("score");
  const fileInputRef = useRef<HTMLInputElement>(null);
  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
    };
    fetchUser();
  }, []);
  useEffect(() => {
    if (!user) return;
    const fetchJobs = async () => {
      const {
        data,
        error
      } = await supabase.from("job_openings").select("*").eq("user_id", user.id).order("created_at", {
        ascending: false
      });
      if (error) {
        console.error("Error fetching jobs:", error);
        return;
      }
      const formattedJobs: Job[] = (data || []).map(job => ({
        id: job.id,
        title: job.title || "Job Description",
        date: format(new Date(job.created_at), "dd MMM yyyy"),
        requirements: job.description,
        resumes: [],
        questions: job.questions as any || {
          mcq: [],
          open: []
        }
      }));
      setJobs(formattedJobs);
    };
    fetchJobs();
  }, [user]);
  useEffect(() => {
    if (!jobId) return;
    const fetchData = async () => {
      try {
        // Fetch job title
        const {
          data: jobData
        } = await supabase.from("job_openings").select("title").eq("id", jobId).single();
        if (jobData) {
          setJobTitle(jobData.title || "Job Opening");
        }

        // Fetch candidates
        const {
          data: candidatesData
        } = await supabase.from("candidates").select("*").eq("job_id", jobId).order("created_at", {
          ascending: false
        });
        if (candidatesData) {
          setCandidates(candidatesData.map(c => ({
            ...c,
            insights: c.insights as any || {
              matching: [],
              not_matching: []
            }
          })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [jobId]);
  const calculateOverallScore = (candidate: Candidate) => {
    const scores = [candidate.cv_rate];
    if (candidate.test_result !== null) scores.push(candidate.test_result);
    if (candidate.ai_interview_score !== null) scores.push(candidate.ai_interview_score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };
  const handleSelectJob = (id: string) => {
    navigate(`/candidates-dashboard?id=${id}`);
  };
  const handleAddJob = () => {
    navigate("/");
  };
  const handleDeleteJob = async (id: string) => {
    try {
      const {
        error
      } = await supabase.from("job_openings").delete().eq("id", id);
      if (error) throw error;
      setJobs(jobs.filter(job => job.id !== id));
      toast.success("Job deleted successfully");
      if (id === jobId && jobs.length > 1) {
        const nextJob = jobs.find(job => job.id !== id);
        if (nextJob) navigate(`/candidates-dashboard?id=${nextJob.id}`);
      } else if (jobs.length === 1) {
        navigate("/");
      }
    } catch (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
    }
  };
  const handleRenameJob = async (id: string, newTitle: string) => {
    try {
      const {
        error
      } = await supabase.from("job_openings").update({
        title: newTitle
      }).eq("id", id);
      if (error) throw error;
      setJobs(jobs.map(job => job.id === id ? {
        ...job,
        title: newTitle
      } : job));
      if (id === jobId) {
        setJobTitle(newTitle);
      }
      toast.success("Job renamed successfully");
    } catch (error) {
      console.error("Error renaming job:", error);
      toast.error("Failed to rename job");
    }
  };
  const handleMakeAssessment = async () => {
    if (!jobId) return;

    // Check if questions already exist
    const {
      data: jobData
    } = await supabase.from("job_openings").select("questions").eq("id", jobId).single();
    if (jobData?.questions && Object.keys(jobData.questions).length > 0) {
      // Questions exist, go directly to review
      navigate(`/questions-review?id=${jobId}`);
      return;
    }

    // No questions, generate them
    setGeneratingQuestions(true);
    try {
      const {
        data: job
      } = await supabase.from("job_openings").select("description").eq("id", jobId).single();
      if (!job) {
        toast.error("Job not found");
        setGeneratingQuestions(false);
        return;
      }

      // Send to n8n for question generation
      const {
        error
      } = await supabase.functions.invoke("send-to-n8n", {
        body: {
          job_id: jobId,
          job_description: job.description
        }
      });
      if (error) throw error;
      toast.success("Questions are being generated...");

      // Navigate to questions review with polling enabled
      navigate(`/questions-review?id=${jobId}`);
    } catch (error: any) {
      console.error("Error generating questions:", error);
      toast.error("Failed to generate questions");
    } finally {
      setGeneratingQuestions(false);
    }
  };

  const handleFileUpload = async (files: FileList | null) => {
    if (!files || !jobId || !user) return;

    const pdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
    
    if (pdfFiles.length === 0) {
      toast.error("Please upload PDF files only");
      return;
    }

    setUploading(true);
    
    for (const file of pdfFiles) {
      try {
        // Generate random CV rate between 60-95
        const cvRate = Math.floor(Math.random() * 36) + 60;
        
        // Extract candidate name from filename (remove .pdf extension)
        const candidateName = file.name.replace('.pdf', '');
        
        // Insert candidate into database
        const { error } = await supabase.from("candidates").insert({
          job_id: jobId,
          user_id: user.id,
          name: candidateName,
          email: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          cv_rate: cvRate,
          cv_text: "CV content extracted"
        });

        if (error) throw error;
      } catch (error) {
        console.error("Error uploading CV:", error);
        toast.error(`Failed to upload ${file.name}`);
      }
    }

    setUploading(false);
    toast.success(`${pdfFiles.length} CV(s) uploaded successfully`);
    
    // Refresh candidates list
    const { data: candidatesData } = await supabase
      .from("candidates")
      .select("*")
      .eq("job_id", jobId)
      .order("created_at", { ascending: false });
    
    if (candidatesData) {
      setCandidates(candidatesData.map(c => ({
        ...c,
        insights: c.insights as any || { matching: [], not_matching: [] }
      })));
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFileUpload(e.dataTransfer.files);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const sortedCandidates = [...candidates].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return calculateOverallScore(b) - calculateOverallScore(a);
      case "name":
        return a.name.localeCompare(b.name);
      case "date":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      default:
        return 0;
    }
  });

  const cvAbove80 = candidates.filter(c => c.cv_rate >= 80).length;
  const cvBelow80 = candidates.filter(c => c.cv_rate < 80).length;
  const testAbove80 = candidates.filter(c => c.test_result !== null && c.test_result >= 80).length;
  const testBelow80 = candidates.filter(c => c.test_result !== null && c.test_result < 80).length;
  const completedTests = candidates.filter(c => c.completed_test).length;
  const pendingTests = candidates.filter(c => !c.completed_test).length;
  if (loading) {
    return <div className="min-h-screen flex flex-col bg-background">
        <AuthHeader />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </main>
      </div>;
  }
  return <div className="min-h-screen flex flex-col bg-background">
      <AuthHeader />
      <div className="flex flex-1">
        <JobSidebar jobs={jobs} activeJobId={jobId || ""} onSelectJob={handleSelectJob} onAddJob={handleAddJob} onDeleteJob={handleDeleteJob} onRenameJob={handleRenameJob} />
        <main className="flex-1 p-6 overflow-auto">
          <div className="max-w-7xl mx-auto space-y-6">
          {/* Breadcrumb Navigation */}
          <Breadcrumb>
            <BreadcrumbList>
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate("/")}
                  className="cursor-pointer hover:text-foreground"
                >
                  Home
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbLink 
                  onClick={() => navigate(`/?id=${jobId}#job-description`)}
                  className="cursor-pointer hover:text-foreground"
                >
                  {jobTitle || "Job Opening"}
                </BreadcrumbLink>
              </BreadcrumbItem>
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                <BreadcrumbPage>Candidates</BreadcrumbPage>
              </BreadcrumbItem>
            </BreadcrumbList>
          </Breadcrumb>

          {/* Header */}
          <div className="flex items-center justify-between">
            
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CV Rating</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Above 80%:</span>
                    <span className="text-2xl font-bold text-green-600">{cvAbove80}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Below 80%:</span>
                    <span className="text-2xl font-bold text-red-600">{cvBelow80}</span>
                  </div>
                </div>
                <Button onClick={() => navigate(`/?id=${jobId}#job-description`)} variant="outline" size="sm" className="w-full">
                  View Job Description
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Results</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Above 80%:</span>
                    <span className="text-2xl font-bold text-green-600">{testAbove80}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Below 80%:</span>
                    <span className="text-2xl font-bold text-red-600">{testBelow80}</span>
                  </div>
                </div>
                <Button onClick={() => navigate(`/questions-review?id=${jobId}`)} variant="outline" size="sm" className="w-full">
                  Send Candidate Test
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">AI Pre-Interview</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed:</span>
                    <span className="text-2xl font-bold text-green-600">{completedTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending:</span>
                    <span className="text-2xl font-bold text-red-600">{pendingTests}</span>
                  </div>
                </div>
                <Button onClick={() => {}} variant="outline" size="sm" className="w-full">
                  Make Pre-Interviews
                </Button>
              </CardContent>
            </Card>

            
          </div>

          {/* Make Assessment Button */}
          <div className="flex justify-center">
            <Button onClick={handleMakeAssessment} size="lg" className="px-8 py-6 text-lg" disabled={generatingQuestions}>
              {generatingQuestions ? <>
                  <RefreshCw className="mr-2 h-5 w-5 animate-spin" />
                  Generating Questions...
                </> : "Make an Assessment for Candidates"}
            </Button>
          </div>

          {/* Candidates Table */}
          <Card 
            onDrop={handleDrop}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            className={`transition-colors ${isDragging ? 'border-primary bg-primary/5' : ''}`}
          >
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl text-foreground font-semibold">Candidates</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">upload cv</p>
                </div>
                <div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="application/pdf"
                    multiple
                    onChange={(e) => handleFileUpload(e.target.files)}
                    className="hidden"
                  />
                  <Button
                    onClick={() => fileInputRef.current?.click()}
                    variant="outline"
                    size="sm"
                    disabled={uploading}
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Choose Files"}
                  </Button>
                </div>
              </div>
              
              {candidates.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(value: "score" | "name" | "date") => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Overall Score</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="date">Upload Date (Newest)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No candidates yet</p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop PDF files here or use the button above
                  </p>
                </div> : <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-[80px_200px_100px_100px_100px_80px_60px] gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground sticky top-0 z-10">
                    <div>Score</div>
                    <div>Candidate</div>
                    <div>CV Rate</div>
                    <div>Test Result</div>
                    <div>AI Interview</div>
                    <div className="text-center">Contact</div>
                    <div className="text-right">Details</div>
                  </div>

                  {/* Table Rows */}
                  {sortedCandidates.map(candidate => {
                  const overallScore = calculateOverallScore(candidate);
                  const scoreColor = overallScore >= 80 ? "text-green-600" : overallScore >= 60 ? "text-yellow-600" : "text-red-600";
                  const isExpanded = expandedCandidateId === candidate.id;
                  return <div key={candidate.id} className="border rounded-lg overflow-hidden">
                        <div className="grid grid-cols-[80px_200px_100px_100px_100px_80px_60px] gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center">
                        {/* Overall Score */}
                        <div className={`text-2xl font-bold ${scoreColor}`}>
                          {overallScore}%
                        </div>

                        {/* Name & Title */}
                        <div>
                          <p className="font-medium text-foreground">{candidate.name}</p>
                          {candidate.title && <p className="text-sm text-muted-foreground">{candidate.title}</p>}
                        </div>

                        {/* CV Rate */}
                        <div className="text-center">
                          <span className={`font-semibold ${candidate.cv_rate >= 80 ? "text-green-600" : "text-red-600"}`}>
                            {candidate.cv_rate}%
                          </span>
                        </div>

                        {/* Test Result */}
                        <div className="text-center">
                          {candidate.test_result !== null ? <span className={`font-semibold ${candidate.test_result >= 80 ? "text-green-600" : "text-red-600"}`}>
                              {candidate.test_result}%
                            </span> : <span className="text-muted-foreground text-sm">-</span>}
                        </div>

                        {/* AI Interview */}
                        <div className="text-center">
                          {candidate.ai_interview_score !== null ? <span className="font-semibold">{candidate.ai_interview_score}%</span> : <span className="text-muted-foreground text-sm">Coming Soon</span>}
                        </div>

                        {/* Contact Actions */}
                        <div className="flex items-center justify-center gap-2">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => window.open(`mailto:${candidate.email}`, "_blank")}>
                            <Mail className="h-4 w-4" />
                          </Button>

                          {candidate.phone && <TooltipProvider>
                              <Tooltip>
                                <TooltipTrigger asChild>
                                  <Button variant="ghost" size="icon" className="h-8 w-8">
                                    <Phone className="h-4 w-4" />
                                  </Button>
                                </TooltipTrigger>
                                <TooltipContent>
                                  <p>{candidate.phone}</p>
                                </TooltipContent>
                              </Tooltip>
                            </TooltipProvider>}
                        </div>

                        {/* Expand Button */}
                        <div className="flex justify-end">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedCandidateId(isExpanded ? null : candidate.id)}>
                            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                          </Button>
                        </div>
                      </div>

                      {/* Expanded Insights Section */}
                      {isExpanded && <div className="px-4 py-4 bg-muted/20 border-t">
                          <div className="space-y-3">
                            <div>
                              <h4 className="font-semibold text-sm text-green-600 mb-2">
                                ✓ Matches Job Description
                              </h4>
                              {candidate.insights.matching.length > 0 ? <ul className="space-y-1 text-sm text-muted-foreground">
                                  {candidate.insights.matching.map((item, idx) => <li key={idx}>• {item}</li>)}
                                </ul> : <p className="text-sm text-muted-foreground">-</p>}
                            </div>
                            <div>
                              <h4 className="font-semibold text-sm text-red-600 mb-2">
                                ✗ Does Not Match Job Description
                              </h4>
                              {candidate.insights.not_matching.length > 0 ? <ul className="space-y-1 text-sm text-muted-foreground">
                                  {candidate.insights.not_matching.map((item, idx) => <li key={idx}>• {item}</li>)}
                                </ul> : <p className="text-sm text-muted-foreground">-</p>}
                            </div>
                          </div>
                        </div>}
                    </div>;
                })}
                </div>}
            </CardContent>
          </Card>
          </div>
        </main>
      </div>
    </div>;
}