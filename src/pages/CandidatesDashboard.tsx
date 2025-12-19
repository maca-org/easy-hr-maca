import { useEffect, useState, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF } from "@/utils/pdfExtractor";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useUnlockSystem } from "@/hooks/useUnlockSystem";
import { useSubscription } from "@/hooks/useSubscription";
import AuthHeader from "@/components/AuthHeader";
import { UploadQueue } from "@/components/UploadQueue";
import { ViewAnswersModal } from "@/components/ViewAnswersModal";
import { LockedCandidateRow } from "@/components/LockedCandidateRow";
import { UpsellBanner } from "@/components/UpsellBanner";
import { UpgradeModal } from "@/components/UpgradeModal";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ChevronDown, ArrowLeft, RefreshCw, Upload, ArrowUp, ListOrdered, Trash2, Loader2, Lock, CreditCard } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "./Index";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

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
  extracted_data?: any;
  relevance_analysis?: any;
  improvement_tips?: any;
  analyzing?: boolean;
  assessment_answers?: any;
  test_detailed_scores?: any;
  is_unlocked?: boolean;
  cv_file_path?: string | null;
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
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueue = useUploadQueue();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCandidates, setDeletingCandidates] = useState<string[]>([]);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  
  // Subscription hook - checks Stripe subscription status
  const { planType: subscriptionPlanType, refreshSubscription } = useSubscription();
  
  // Unlock system hook
  const { unlockStatus, unlockingIds, unlockCandidate, refreshStatus } = useUnlockSystem(user?.id);
  // Check for payment success and refresh unlock status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast.success("Ödeme başarılı! Plan güncelleniyor...");
      // Refresh both subscription and unlock status
      refreshSubscription();
      refreshStatus();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + `?id=${jobId}`);
    }
  }, [refreshSubscription, refreshStatus, jobId]);

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
        },
        candidateCount: 0
      }));
      setJobs(formattedJobs);
    };
    fetchJobs();
  }, [user]);
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 300);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

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
          console.log('Fetched candidates:', candidatesData.map(c => ({ name: c.name, cv_rate: c.cv_rate })));
          setCandidates(candidatesData.map(c => ({
            ...c,
            insights: c.insights as any || {
              matching: [],
              not_matching: []
            },
            extracted_data: c.extracted_data || undefined,
            relevance_analysis: c.relevance_analysis || undefined,
            improvement_tips: c.improvement_tips || undefined
          })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };
    fetchData();

    // Set up realtime subscription to listen for analysis updates
    const channel = supabase
      .channel(`cv-analysis-updates-${jobId}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'candidates',
          filter: `job_id=eq.${jobId}`
        },
        (payload) => {
          console.log('Realtime candidate update:', payload.new);
          setCandidates(prev => prev.map(c => 
            c.id === (payload.new as any).id 
              ? { 
                  ...(payload.new as Candidate), 
                  analyzing: false,
                  insights: (payload.new as any).insights || { matching: [], not_matching: [] }
                }
              : c
          ));
          if ((payload.new as any).cv_rate > 0) {
            toast.success(`Analysis complete for ${(payload.new as any).name}: ${(payload.new as any).cv_rate}%`);
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
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
      } = await supabase.from("job_openings").select("title, description").eq("id", jobId).single();
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
          title: job.title,
          description: job.description
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

    // Add files to queue
    const queueItems = uploadQueue.addToQueue(pdfFiles);
    setUploading(true);

    // Fetch job description once
    const { data: jobData } = await supabase
      .from("job_openings")
      .select("description, title")
      .eq("id", jobId)
      .single();

    if (!jobData) {
      toast.error("Job not found");
      setUploading(false);
      queueItems.forEach(item => {
        uploadQueue.updateQueueItem(item.id, { status: 'failed', error: 'Job not found' });
      });
      return;
    }

    // Process all files in parallel
    const uploadPromises = pdfFiles.map(async (file, index) => {
      const queueItem = queueItems[index];
      
      try {
        // Extract candidate name from filename
        const candidateName = file.name.replace('.pdf', '');

        // Update queue: extracting
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'extracting', 
          progress: 20 
        });

        // Extract text from PDF
        const cvText = await extractTextFromPDF(file);

        // Update queue: uploading to storage
        uploadQueue.updateQueueItem(queueItem.id, { 
          progress: 35 
        });

        // Generate unique file path for storage
        const timestamp = Date.now();
        const safeFileName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
        const cvFilePath = `${jobId}/${timestamp}_${safeFileName}`;

        // Upload CV to storage
        const { error: storageError } = await supabase.storage
          .from('cvs')
          .upload(cvFilePath, file, {
            contentType: 'application/pdf',
            upsert: false
          });

        if (storageError) {
          console.error("Storage upload error:", storageError);
          // Continue without storage - CV text is still saved
        }

        // Update queue: extracted
        uploadQueue.updateQueueItem(queueItem.id, { 
          progress: 45 
        });

        // Insert candidate into database with cv_file_path
        const { data: newCandidate, error } = await supabase
          .from("candidates")
          .insert({
            job_id: jobId,
            user_id: user.id,
            name: candidateName,
            email: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            cv_rate: 0,
            cv_text: cvText,
            cv_file_path: storageError ? null : cvFilePath
          })
          .select()
          .single();

        if (error) throw error;

        // Add to UI with analyzing flag
        setCandidates(prev => [{
          ...newCandidate,
          analyzing: true,
          insights: { matching: [], not_matching: [] }
        }, ...prev]);

        // Update queue: analyzing
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'analyzing', 
          progress: 60 
        });

        // Call analyze-cv edge function
        const { error: analyzeError } = await supabase.functions.invoke('analyze-cv', {
          body: {
            candidate_id: newCandidate.id,
            job_id: jobId,
            cv_text: cvText,
            job_description: jobData.description,
            job_title: jobData.title
          }
        });

        if (analyzeError) {
          throw analyzeError;
        }

        // Update queue: completed
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'completed', 
          progress: 100 
        });

        return { success: true, fileName: file.name };

      } catch (error) {
        console.error("Error uploading CV:", error);
        
        // Update queue: failed
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });

        return { success: false, fileName: file.name, error };
      }
    });

    // Wait for all uploads to complete
    const results = await Promise.allSettled(uploadPromises);
    
    // Show summary toast
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;
    
    if (successCount > 0) {
      toast.success(`${successCount} CV(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
    }
    if (failCount > 0 && successCount === 0) {
      toast.error(`Failed to upload ${failCount} CV(s)`);
    }

    setUploading(false);
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

  const handleSelectCandidate = (id: string) => {
    setSelectedCandidates(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    if (selectedCandidates.length === candidates.length) {
      setSelectedCandidates([]);
    } else {
      setSelectedCandidates(candidates.map(c => c.id));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedCandidates.length === 0) return;
    setDeletingCandidates(selectedCandidates);
    setDeleteDialogOpen(true);
  };

  const handleDeleteSingle = (id: string) => {
    setDeletingCandidates([id]);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .in("id", deletingCandidates);

      if (error) throw error;

      setCandidates(prev => prev.filter(c => !deletingCandidates.includes(c.id)));
      setSelectedCandidates([]);
      toast.success(`${deletingCandidates.length} candidate(s) deleted successfully`);
    } catch (error) {
      console.error("Error deleting candidates:", error);
      toast.error("Failed to delete candidate(s)");
    } finally {
      setDeleteDialogOpen(false);
      setDeletingCandidates([]);
    }
  };

  const scrollToTop = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Handle unlock candidate
  const handleUnlockCandidate = async (candidateId: string) => {
    const success = await unlockCandidate(candidateId);
    if (success) {
      // Update local state
      setCandidates(prev => prev.map(c => 
        c.id === candidateId ? { ...c, is_unlocked: true } : c
      ));
    }
  };

  // Handle upgrade - now uses Stripe checkout via UpgradeModal
  const handleSelectPlan = (plan: string) => {
    // The UpgradeModal now handles the Stripe checkout directly
    setUpgradeModalOpen(false);
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

  // Calculate stats
  const cvAbove80 = candidates.filter(c => c.cv_rate >= 80).length;
  const cvBelow80 = candidates.filter(c => c.cv_rate < 80).length;
  const testAbove80 = candidates.filter(c => c.test_result !== null && c.test_result >= 80).length;
  const testBelow80 = candidates.filter(c => c.test_result !== null && c.test_result < 80).length;
  const completedTests = candidates.filter(c => c.completed_test).length;
  const pendingTests = candidates.filter(c => !c.completed_test).length;
  const unlockedCandidates = candidates.filter(c => c.is_unlocked).length;
  const lockedCandidates = candidates.length - unlockedCandidates;
  if (loading || uploading) {
    return <div className="min-h-screen flex flex-col bg-background">
        <AuthHeader />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">
                {uploading ? "Processing PDF files..." : "Loading..."}
              </p>
            </div>
          </div>
        </main>
      </div>;
  }
  return <div className="min-h-screen flex flex-col bg-background">
      <AuthHeader />
      <main className="flex-1 p-4 overflow-auto">
        <div className="max-w-7xl mx-auto space-y-4">
          {/* Header with Back Button and Job Title */}
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
            <Button variant="ghost" onClick={() => navigate("/jobs")} className="self-start shrink-0">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Jobs
            </Button>
            <h1 className="text-2xl font-bold text-center sm:flex-1">{jobTitle}</h1>
            <div className="hidden sm:block w-[120px]"></div>
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
                <Button onClick={() => navigate(`/jobs?id=${jobId}`)} variant="outline" size="sm" className="w-full">
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
                <Button 
                  onClick={() => document.getElementById('candidates-table')?.scrollIntoView({ behavior: 'smooth', block: 'start' })} 
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  View Candidates
                </Button>
              </CardContent>
            </Card>

            
          </div>

          {/* Upsell Banner - Show when there are locked candidates */}
          {lockedCandidates > 0 && (
            <UpsellBanner
              totalCandidates={candidates.length}
              unlockedCount={unlockedCandidates}
              planType={unlockStatus.planType}
              monthlyLimit={unlockStatus.limit}
              usedThisMonth={unlockStatus.used}
              onUpgrade={() => setUpgradeModalOpen(true)}
            />
          )}

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
          <Card id="candidates-table" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`transition-colors scroll-mt-6 ${isDragging ? 'border-primary bg-primary/5' : ''}`}>
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
                <div className="space-y-1">
                  <CardTitle className="text-xl text-foreground font-semibold">Candidates</CardTitle>
                  <p className="text-sm text-muted-foreground font-normal">upload cv</p>
                </div>
                <div className="flex gap-2">
                  {selectedCandidates.length > 0 && (
                    <Button 
                      onClick={handleDeleteSelected} 
                      variant="destructive" 
                      size="sm"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete Selected ({selectedCandidates.length})
                    </Button>
                  )}
                  <input ref={fileInputRef} type="file" accept="application/pdf" multiple onChange={e => handleFileUpload(e.target.files)} className="hidden" />
                  <Button onClick={() => fileInputRef.current?.click()} variant="outline" size="sm" disabled={uploading}>
                    <Upload className="h-4 w-4 mr-2" />
                    {uploading ? "Uploading..." : "Choose Files"}
                  </Button>
                  {uploadQueue.queue.length > 0 && (
                    <Button 
                      onClick={() => uploadQueue.setIsQueueOpen(true)} 
                      variant="outline" 
                      size="sm"
                      className="relative"
                    >
                      <ListOrdered className="h-4 w-4 mr-2" />
                      Queue ({uploadQueue.queue.length})
                      {uploadQueue.queue.some(item => item.status === 'analyzing' || item.status === 'extracting') && (
                        <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-blue-500 animate-pulse" />
                      )}
                    </Button>
                  )}
                </div>
              </div>
              
              {candidates.length > 0 && <div className="flex items-center gap-2">
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
                </div>}
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? <div className="text-center py-8">
                  <p className="text-muted-foreground mb-4">No candidates yet</p>
                  <p className="text-sm text-muted-foreground">
                    Drag and drop PDF files here or use the button above
                  </p>
                </div> : <div className="space-y-2 max-h-[600px] overflow-y-auto">
                  {/* Table Header */}
                  <div className="grid grid-cols-[40px_80px_200px_100px_100px_100px_100px_80px_80px_50px] gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground sticky top-0 z-10">
                    <div className="flex items-center justify-center">
                      <Checkbox 
                        checked={selectedCandidates.length === candidates.length && candidates.length > 0}
                        onCheckedChange={handleSelectAll}
                      />
                    </div>
                    <div>Score</div>
                    <div>Candidate</div>
                    <div>CV Rate</div>
                    <div>Test Result</div>
                    <div>AI Interview</div>
                    <div className="text-center">Answers</div>
                    <div className="text-center">Contact</div>
                    <div className="text-center">CV</div>
                    <div className="text-center">Actions</div>
                  </div>

                  {/* Table Rows - Using LockedCandidateRow component */}
                  {sortedCandidates.map(candidate => {
                    const overallScore = calculateOverallScore(candidate);
                    return (
                      <LockedCandidateRow
                        key={candidate.id}
                        candidate={candidate}
                        overallScore={overallScore}
                        isExpanded={expandedCandidateId === candidate.id}
                        isSelected={selectedCandidates.includes(candidate.id)}
                        isUnlocking={unlockingIds.has(candidate.id)}
                        onSelect={handleSelectCandidate}
                        onExpand={setExpandedCandidateId}
                        onDelete={handleDeleteSingle}
                        onUnlock={handleUnlockCandidate}
                        canUnlock={unlockStatus.canUnlock}
                        planType={unlockStatus.planType}
                      />
                    );
                  })}
                </div>}
            </CardContent>
          </Card>
          </div>
        </main>

      {/* Floating Scroll to Top Button */}
      {showScrollTop && (
        <Button
          onClick={scrollToTop}
          size="icon"
          className="fixed bottom-6 right-6 h-12 w-12 rounded-full shadow-lg animate-fade-in z-50"
        >
          <ArrowUp className="h-5 w-5" />
        </Button>
      )}

      {/* Upload Queue */}
      <UploadQueue
        queue={uploadQueue.queue}
        isOpen={uploadQueue.isQueueOpen}
        onClose={() => uploadQueue.setIsQueueOpen(false)}
        onClearCompleted={uploadQueue.clearCompleted}
        onClearAll={uploadQueue.clearAll}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={upgradeModalOpen}
        onClose={() => setUpgradeModalOpen(false)}
        currentPlan={unlockStatus.planType}
        onSelectPlan={handleSelectPlan}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Candidate{deletingCandidates.length > 1 ? 's' : ''}</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete {deletingCandidates.length} candidate{deletingCandidates.length > 1 ? 's' : ''}? 
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
}