import { useEffect, useState, useRef, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { extractTextFromPDF } from "@/utils/pdfExtractor";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { useCreditSystem, clearCreditCache } from "@/hooks/useCreditSystem";
import { useSubscription } from "@/hooks/useSubscription";
import AuthHeader from "@/components/AuthHeader";
import { UploadQueue } from "@/components/UploadQueue";
import { ViewAnswersModal } from "@/components/ViewAnswersModal";
import { CandidateRow } from "@/components/CandidateRow";
import { UpsellBanner } from "@/components/UpsellBanner";
import { UpgradeModal } from "@/components/UpgradeModal";
import { OfferLetterDrawer } from "@/components/OfferLetterDrawer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ChevronDown, ArrowLeft, RefreshCw, Upload, ArrowUp, ListOrdered, Trash2, Loader2, CreditCard, Star, FileText, Eye } from "lucide-react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Job } from "./Index";
import { toast } from "sonner";
import { format } from "date-fns";
import { Checkbox } from "@/components/ui/checkbox";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  is_favorite?: boolean;
  assessment_sent?: boolean;
  assessment_sent_at?: string | null;
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
  const [sortBy, setSortBy] = useState<"score" | "name" | "date" | "assessment_sent" | "assessment_not_sent">("score");
  const [showScrollTop, setShowScrollTop] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const uploadQueue = useUploadQueue();
  const [selectedCandidates, setSelectedCandidates] = useState<string[]>([]);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingCandidates, setDeletingCandidates] = useState<string[]>([]);
  const [upgradeModalOpen, setUpgradeModalOpen] = useState(false);
  const [isScreening, setIsScreening] = useState(false);
  const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
  const [offerDrawerOpen, setOfferDrawerOpen] = useState(false);
  const [offerPreselectedCandidateId, setOfferPreselectedCandidateId] = useState<string | undefined>(undefined);
  const [companyName, setCompanyName] = useState("");
  const [offerLetterCount, setOfferLetterCount] = useState(0);
  const [savedOffersModalOpen, setSavedOffersModalOpen] = useState(false);
  const [savedOffers, setSavedOffers] = useState<any[]>([]);
  const [loadingSavedOffers, setLoadingSavedOffers] = useState(false);
  
  // Callback for when credit limit is reached
  const handleLimitReached = useCallback(() => {
    setUpgradeModalOpen(true);
    toast.warning("You've reached your monthly credit limit!", {
      description: "Upgrade your plan to continue analyzing CVs."
    });
  }, []);
  
  // Unified credit system hook - replaces both useCreditStatus and useAnalysisCredits
  const { 
    isAtLimit, 
    canAnalyze,
    used,
    remaining,
    planType: creditPlanType,
    useCredit, 
    refreshCredits 
  } = useCreditSystem(user?.id, {
    onLimitReached: handleLimitReached
  });
  
  // Subscription hook - checks Stripe subscription status
  const { planType: subscriptionPlanType, refreshSubscription } = useSubscription();
  
  // Check for payment success and refresh credit status
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      toast.success("Ödeme başarılı! Plan güncelleniyor...");
      // Clear cache and refresh
      clearCreditCache();
      refreshSubscription();
      refreshCredits();
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname + `?id=${jobId}`);
    }
  }, [refreshSubscription, refreshCredits, jobId]);

  useEffect(() => {
    const fetchUser = async () => {
      const {
        data: {
          user
        }
      } = await supabase.auth.getUser();
      setUser(user);
      
      // Fetch company name from profile
      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("id", user.id)
          .maybeSingle();
        
        if (profile?.company_name) {
          setCompanyName(profile.company_name);
        }
      }
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

        // Fetch offer letter count
        const { count } = await supabase
          .from("offer_letters")
          .select("*", { count: 'exact', head: true })
          .eq("job_id", jobId);
        setOfferLetterCount(count || 0);
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
          throw new Error(`Storage upload failed: ${storageError.message}`);
        }

        // Update queue: extracted
        uploadQueue.updateQueueItem(queueItem.id, { 
          progress: 45 
        });

        // Check if user has analysis credits BEFORE inserting candidate
        const creditResult = await useCredit();
        const canAnalyze = creditResult.canAnalyze;

        // INSERT CANDIDATE FIRST (so RLS policy passes for signed URL)
        const { data: newCandidate, error } = await supabase
          .from("candidates")
          .insert({
            job_id: jobId,
            user_id: user.id,
            name: candidateName,
            email: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            cv_rate: 0,
            cv_text: cvText, // Keep for backward compatibility
            cv_file_path: cvFilePath,
            is_unlocked: true // All candidates are now automatically unlocked
          })
          .select()
          .single();

        if (error) throw error;

        // Add to UI
        setCandidates(prev => [{
          ...newCandidate,
          analyzing: canAnalyze, // Only show analyzing if we have credits
          insights: { matching: [], not_matching: [] }
        }, ...prev]);

        if (canAnalyze) {
          // Update queue: analyzing
          uploadQueue.updateQueueItem(queueItem.id, { 
            status: 'analyzing', 
            progress: 60 
          });

          // Call analyze-cv edge function with cv_text (text-based for manual uploads)
          // No signed URL needed - we send the parsed text directly
          const { error: analyzeError } = await supabase.functions.invoke('analyze-cv', {
            body: {
              candidate_id: newCandidate.id,
              job_id: jobId,
              cv_text: cvText, // Send parsed text for manual uploads
              cv_file_path: cvFilePath,
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
        } else {
          // No credits - CV saved but not analyzed
          uploadQueue.updateQueueItem(queueItem.id, { 
            status: 'completed', 
            progress: 100 
          });
          
          // Show message that CV was saved but not analyzed
          toast.info(`${candidateName}: CV saved. Upgrade to analyze.`, {
            description: `Remaining credits: ${creditResult.remaining}`
          });
        }

        return { success: true, fileName: file.name, analyzed: canAnalyze };

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
    const successResults = results.filter(r => r.status === 'fulfilled' && r.value.success);
    const analyzedCount = successResults.filter(r => r.status === 'fulfilled' && r.value.analyzed).length;
    const savedCount = successResults.length - analyzedCount;
    const failCount = results.length - successResults.length;
    
    if (analyzedCount > 0) {
      toast.success(`${analyzedCount} CV(s) uploaded and analyzing...`);
    }
    if (savedCount > 0) {
      toast.info(`${savedCount} CV(s) saved. Upgrade to analyze them.`);
    }
    if (failCount > 0 && successResults.length === 0) {
      toast.error(`Failed to upload ${failCount} CV(s)`);
    }

    // Refresh credit status after uploads
    refreshCredits();
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

  // Get selected candidates that are pending analysis (cv_rate = 0)
  const selectedPendingCandidates = selectedCandidates.filter(id => {
    const candidate = candidates.find(c => c.id === id);
    return candidate && candidate.cv_rate === 0;
  });

  // Handle Resume Screening for pending candidates
  const handleResumeScreening = async () => {
    if (selectedPendingCandidates.length === 0) return;
    
    setIsScreening(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        toast.error("Authentication required");
        return;
      }

      const { data, error } = await supabase.functions.invoke('analyze-pending-cvs', {
        body: { candidate_ids: selectedPendingCandidates },
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (error) throw error;

      // Mark processed candidates as analyzing in the UI
      if (data.processed_ids) {
        setCandidates(prev => prev.map(c => 
          data.processed_ids.includes(c.id) 
            ? { ...c, analyzing: true }
            : c
        ));
      }

      if (data.processed > 0) {
        toast.success(`${data.processed} aday analiz ediliyor!`);
      }
      if (data.skipped > 0) {
        toast.warning(`${data.skipped} aday için credit yetersiz`, {
          description: `Kalan credit: ${data.remaining_credits}`
        });
      }

      // Clear selection and refresh credits
      setSelectedCandidates([]);
      refreshCredits();
    } catch (error) {
      console.error('Resume screening error:', error);
      toast.error('Analiz başlatılamadı');
    } finally {
      setIsScreening(false);
    }
  };

  // Handle upgrade - now uses Stripe checkout via UpgradeModal
  const handleSelectPlan = (plan: string) => {
    // The UpgradeModal now handles the Stripe checkout directly
    setUpgradeModalOpen(false);
  };

  // Toggle favorite handler with optimistic update
  const handleToggleFavorite = async (candidateId: string, newValue: boolean) => {
    // Optimistic update
    setCandidates(prev => prev.map(c => 
      c.id === candidateId ? { ...c, is_favorite: newValue } : c
    ));
    
    try {
      const { error } = await supabase
        .from('candidates')
        .update({ is_favorite: newValue })
        .eq('id', candidateId);
        
      if (error) throw error;
      
      toast.success(newValue ? 'Added to favorites' : 'Removed from favorites');
    } catch (error) {
      // Revert on error
      setCandidates(prev => prev.map(c => 
        c.id === candidateId ? { ...c, is_favorite: !newValue } : c
      ));
      toast.error('Failed to update favorite');
    }
  };

  // Handle prepare offer - opens drawer with preselected candidate
  const handlePrepareOffer = (candidateId?: string) => {
    setOfferPreselectedCandidateId(candidateId);
    setOfferDrawerOpen(true);
  };

  // Fetch saved offer letters
  const fetchSavedOffers = async () => {
    if (!jobId) return;
    setLoadingSavedOffers(true);
    try {
      const { data, error } = await supabase
        .from('offer_letters')
        .select('id, candidate_id, company_name, job_title, salary_amount, currency, created_at')
        .eq('job_id', jobId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map candidate names
      const offersWithNames = (data || []).map(offer => {
        const candidate = candidates.find(c => c.id === offer.candidate_id);
        return { ...offer, candidate_name: candidate?.name || 'Unknown' };
      });
      
      setSavedOffers(offersWithNames);
    } catch (error) {
      console.error('Error fetching saved offers:', error);
      toast.error('Failed to load saved offers');
    } finally {
      setLoadingSavedOffers(false);
    }
  };

  const handleViewSavedOffers = () => {
    fetchSavedOffers();
    setSavedOffersModalOpen(true);
  };

  // Filter by favorites first, then sort
  const filteredCandidates = showOnlyFavorites 
    ? candidates.filter(c => c.is_favorite)
    : candidates;

  const sortedCandidates = [...filteredCandidates].sort((a, b) => {
    switch (sortBy) {
      case "score":
        return calculateOverallScore(b) - calculateOverallScore(a);
      case "name":
        return a.name.localeCompare(b.name);
      case "date":
        return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
      case "assessment_sent":
        // Put sent assessments first, then sort by sent date (newest first)
        if (a.assessment_sent && b.assessment_sent) {
          const dateA = a.assessment_sent_at ? new Date(a.assessment_sent_at).getTime() : 0;
          const dateB = b.assessment_sent_at ? new Date(b.assessment_sent_at).getTime() : 0;
          return dateB - dateA;
        }
        return (b.assessment_sent ? 1 : 0) - (a.assessment_sent ? 1 : 0);
      case "assessment_not_sent":
        // Put not sent first, then sort by overall score (best candidates first)
        if (!a.assessment_sent && !b.assessment_sent) {
          return calculateOverallScore(b) - calculateOverallScore(a);
        }
        return (a.assessment_sent ? 1 : 0) - (b.assessment_sent ? 1 : 0);
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
  const analyzedCandidates = candidates.filter(c => c.cv_rate > 0 || c.relevance_analysis).length;
  const pendingAnalysis = candidates.length - analyzedCandidates;
  if (loading) {
    return <div className="min-h-screen flex flex-col bg-background">
        <AuthHeader />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading...</p>
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
                <CardTitle className="text-lg">Assessment Status</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Sent:</span>
                    <span className="text-2xl font-bold text-blue-600">{candidates.filter(c => c.assessment_sent).length}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Completed:</span>
                    <span className="text-2xl font-bold text-green-600">{completedTests}</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Pending:</span>
                    <span className="text-2xl font-bold text-yellow-600">{candidates.filter(c => c.assessment_sent && !c.completed_test).length}</span>
                  </div>
                </div>
                <Button onClick={() => navigate(`/questions-review?id=${jobId}`)} variant="outline" size="sm" className="w-full">
                  Send Candidate Test
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Offer Letter
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">Offers Prepared:</span>
                    <span className="text-2xl font-bold text-primary">{offerLetterCount}</span>
                  </div>
                </div>
                <Button 
                  onClick={() => handlePrepareOffer()}
                  variant="outline" 
                  size="sm" 
                  className="w-full"
                >
                  Prepare Offer Letter
                </Button>
                {offerLetterCount > 0 && (
                  <Button 
                    onClick={handleViewSavedOffers}
                    variant="ghost" 
                    size="sm" 
                    className="w-full text-xs"
                  >
                    <Eye className="h-3 w-3 mr-1" />
                    View Saved Offers ({offerLetterCount})
                  </Button>
                )}
              </CardContent>
            </Card>

            
          </div>

          {/* Upsell Banner - Show when there are pending analysis candidates or credits running low */}
          {(pendingAnalysis > 0 || !canAnalyze) && (
            <UpsellBanner
              totalCandidates={candidates.length}
              analyzedCount={analyzedCandidates}
              planType={creditPlanType}
              monthlyLimit={remaining}
              usedThisMonth={used}
              onUpgrade={() => setUpgradeModalOpen(true)}
            />
          )}


          {/* Candidates Table */}
          <Card id="candidates-table" onDrop={handleDrop} onDragOver={handleDragOver} onDragLeave={handleDragLeave} className={`transition-colors scroll-mt-6 ${isDragging ? 'border-primary bg-primary/5' : ''}`}>
            <CardHeader className="space-y-4 pb-4">
              <div className="flex flex-row items-center justify-between">
              <div className="flex items-center gap-2">
                  <CardTitle className="text-xl text-foreground font-semibold">Candidates</CardTitle>
                  <Button 
                    variant="ghost" 
                    size="icon"
                    onClick={() => {
                      setLoading(true);
                      supabase.from("candidates").select("*").eq("job_id", jobId).order("created_at", { ascending: false }).then(({ data }) => {
                        if (data) {
                          setCandidates(data.map(c => ({
                            ...c,
                            insights: c.insights as any || { matching: [], not_matching: [] },
                            extracted_data: c.extracted_data || undefined,
                            relevance_analysis: c.relevance_analysis || undefined,
                            improvement_tips: c.improvement_tips || undefined
                          })));
                        }
                        setLoading(false);
                        toast.success("Candidates refreshed");
                      });
                    }}
                    className="h-8 w-8"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </Button>
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
                    {uploading ? "Uploading..." : "Upload Resume"}
                  </Button>
                </div>
              </div>
              
              {candidates.length > 0 && <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-muted-foreground">Sort by:</span>
                  <Select value={sortBy} onValueChange={(value: "score" | "name" | "date" | "assessment_sent" | "assessment_not_sent") => setSortBy(value)}>
                    <SelectTrigger className="w-[180px]">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="score">Overall Score</SelectItem>
                      <SelectItem value="name">Name (A-Z)</SelectItem>
                      <SelectItem value="date">Upload Date (Newest)</SelectItem>
                      <SelectItem value="assessment_sent">Assessment Sent</SelectItem>
                      <SelectItem value="assessment_not_sent">Assessment Not Sent</SelectItem>
                    </SelectContent>
                  </Select>
                  
                  {/* Favorites Filter */}
                  <div className="flex items-center gap-2 ml-4">
                    <Checkbox 
                      id="show-favorites"
                      checked={showOnlyFavorites}
                      onCheckedChange={(checked) => setShowOnlyFavorites(checked === true)}
                    />
                    <label 
                      htmlFor="show-favorites" 
                      className="text-sm text-muted-foreground cursor-pointer flex items-center gap-1"
                    >
                      <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                      Show only favorites
                    </label>
                  </div>
                  
                  {/* Resume Screening Button - shows when pending candidates are selected */}
                  {selectedPendingCandidates.length > 0 && (
                    <Button 
                      onClick={handleResumeScreening}
                      variant="default"
                      size="sm"
                      disabled={isScreening || !canAnalyze}
                      className="ml-2"
                    >
                      <RefreshCw className={`h-4 w-4 mr-2 ${isScreening ? 'animate-spin' : ''}`} />
                      Resume Screening ({selectedPendingCandidates.length})
                    </Button>
                  )}
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
                  <div className="grid grid-cols-[40px_80px_200px_100px_100px_100px_80px_80px_50px] gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground sticky top-0 z-10">
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
                    <div className="text-center">Answers</div>
                    <div className="text-center">Contact</div>
                    <div className="text-center">Report</div>
                    <div className="text-center">Actions</div>
                  </div>

                  {/* Table Rows - Using CandidateRow component */}
                  {sortedCandidates.map(candidate => {
                    const overallScore = calculateOverallScore(candidate);
                    const currentJob = jobs.find(j => j.id === jobId);
                    // Handle both array format and {mcq: [], open: []} format
                    const rawQuestions = currentJob?.questions;
                    const jobQuestions = Array.isArray(rawQuestions) 
                      ? rawQuestions.filter(q => q.type === 'mcq')
                      : (rawQuestions as any)?.mcq || [];
                    return (
                      <CandidateRow
                        key={candidate.id}
                        candidate={candidate}
                        overallScore={overallScore}
                        isExpanded={expandedCandidateId === candidate.id}
                        isSelected={selectedCandidates.includes(candidate.id)}
                        isFavorite={candidate.is_favorite || false}
                        onSelect={handleSelectCandidate}
                        onExpand={setExpandedCandidateId}
                        onDelete={handleDeleteSingle}
                        onUpgrade={() => setUpgradeModalOpen(true)}
                        onToggleFavorite={handleToggleFavorite}
                        onPrepareOffer={handlePrepareOffer}
                        jobQuestions={jobQuestions}
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
        currentPlan={creditPlanType}
        onSelectPlan={handleSelectPlan}
      />

      {/* Offer Letter Drawer */}
      <OfferLetterDrawer
        isOpen={offerDrawerOpen}
        onClose={() => {
          setOfferDrawerOpen(false);
          setOfferPreselectedCandidateId(undefined);
        }}
        candidates={candidates.map(c => ({ id: c.id, name: c.name, email: c.email }))}
        preselectedCandidateId={offerPreselectedCandidateId}
        jobId={jobId || ""}
        jobTitle={jobTitle}
        companyName={companyName}
        hrName={user?.email?.split("@")[0] || "HR Manager"}
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

      {/* Saved Offer Letters Modal */}
      <Dialog open={savedOffersModalOpen} onOpenChange={setSavedOffersModalOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Saved Offer Letters
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {loadingSavedOffers ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : savedOffers.length === 0 ? (
              <p className="text-center text-muted-foreground py-8">No saved offer letters</p>
            ) : (
              savedOffers.map(offer => (
                <div 
                  key={offer.id} 
                  className="p-4 border rounded-lg hover:bg-muted/50 transition-colors cursor-pointer"
                  onClick={() => {
                    setSavedOffersModalOpen(false);
                    handlePrepareOffer(offer.candidate_id);
                  }}
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-medium">{offer.candidate_name}</p>
                      <p className="text-sm text-muted-foreground">{offer.job_title}</p>
                      <p className="text-sm text-muted-foreground">{offer.company_name}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-primary">
                        {offer.currency} {offer.salary_amount?.toLocaleString()}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(offer.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>;
}