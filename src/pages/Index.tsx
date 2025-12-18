import { Header } from "@/components/Header";
import { JobList } from "@/components/jobs/JobList";
import { JobCreateForm } from "@/components/jobs/JobCreateForm";
import { JobDetailView } from "@/components/jobs/JobDetailView";
import { UploadQueue } from "@/components/UploadQueue";
import { useState, useEffect, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateQuestions } from "@/utils/questionGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { extractTextFromPDF } from "@/utils/pdfExtractor";
import { useUploadQueue } from "@/hooks/useUploadQueue";
import { debounce } from "@/lib/utils";

export interface Resume {
  id: string;
  name: string;
  filename: string;
  match: number;
}

export interface Question {
  id: string;
  type: "mcq" | "open";
  question: string;
  options?: string[];
  correct_answer?: string;
  skill?: string;
  difficulty?: "easy" | "medium" | "hard";
}

export interface Job {
  id: string;
  date: string;
  title: string;
  requirements: string;
  resumes: Resume[];
  questions: Question[];
  slug?: string | null;
}

type ViewState = "list" | "create" | "detail";

const Index = () => {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("");
  const [currentView, setCurrentView] = useState<ViewState>("list");
  const [hasQuestions, setHasQuestions] = useState<boolean>(false);
  const uploadQueue = useUploadQueue();

  const activeJob = jobs.find((job) => job.id === activeJobId);

  // Debounced auto-save function
  const debouncedSaveJob = useCallback(
    debounce(async (jobId: string, title: string, requirements: string) => {
      if (!jobId || !user) return;
      
      // UUID validation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(jobId)) return;
      
      try {
        const { error } = await supabase
          .from("job_openings")
          .update({ title, description: requirements })
          .eq("id", jobId);
        
        if (error) throw error;
      } catch (error) {
        console.error("Auto-save failed:", error);
      }
    }, 1500),
    [user]
  );

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Load jobs from Supabase on mount (filtered by user)
  useEffect(() => {
    if (!user) return;

    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from("job_openings")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error fetching jobs:", error);
        toast.error("Failed to load jobs");
        return;
      }

      if (data) {
        const mappedJobs: Job[] = data.map((row) => ({
          id: row.id,
          date: new Date(row.created_at).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          }),
          title: row.title || "",
          requirements: row.description,
          resumes: [],
          questions: [],
          slug: (row as any).slug || null,
        }));
        setJobs(mappedJobs);
        
        // Set active job from URL parameter if present
        const jobIdFromUrl = searchParams.get("id");
        if (jobIdFromUrl && mappedJobs.some(job => job.id === jobIdFromUrl)) {
          setActiveJobId(jobIdFromUrl);
          setCurrentView("detail");
        }
      }
    };

    fetchJobs();
  }, [user, searchParams]);

  // Check if active job has questions
  useEffect(() => {
    const checkQuestions = async () => {
      if (!activeJobId) {
        setHasQuestions(false);
        return;
      }

      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(activeJobId)) {
        setHasQuestions(false);
        return;
      }

      const { data, error } = await supabase
        .from("job_openings")
        .select("questions")
        .eq("id", activeJobId)
        .maybeSingle();

      if (error) {
        console.error("Error checking questions:", error);
        setHasQuestions(false);
        return;
      }

      const questionsExist = data?.questions && 
        typeof data.questions === 'object' && 
        Array.isArray(data.questions) && 
        data.questions.length > 0;

      setHasQuestions(questionsExist);
    };

    checkQuestions();
  }, [activeJobId]);

  const handleCreateJob = async () => {
    if (!user) {
      toast.error("You must be logged in to create jobs");
      return;
    }

    try {
      const { data: newJob, error } = await supabase
        .from('job_openings')
        .insert({
          title: "",
          description: "",
          user_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      const jobObj: Job = {
        id: newJob.id,
        date: new Date(newJob.created_at).toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
        title: "",
        requirements: "",
        resumes: [],
        questions: [],
        slug: (newJob as any).slug || null,
      };

      setJobs([jobObj, ...jobs]);
      setActiveJobId(newJob.id);
      setCurrentView("create");
      setSearchParams({ id: newJob.id });
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to create job");
    }
  };

  const handleSelectJob = (id: string) => {
    navigate(`/candidates-dashboard?id=${id}`);
  };

  const handleDeleteJob = async (id: string) => {
    const { error } = await supabase
      .from("job_openings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
      return;
    }

    setJobs(jobs.filter((job) => job.id !== id));
    if (activeJobId === id) {
      setActiveJobId("");
      setCurrentView("list");
      setSearchParams({});
    }
    toast.success("Job deleted successfully");
  };

  const handleSaveJob = async (title: string, description: string) => {
    if (!activeJobId || !user) return;

    try {
      // Generate slug from title
      const generateSlug = (text: string): string => {
        return text
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '')
          || activeJobId;
      };

      const baseSlug = generateSlug(title);
      
      // Check if slug already exists for other jobs
      const { data: existingSlugs } = await supabase
        .from('job_openings')
        .select('slug')
        .neq('id', activeJobId)
        .like('slug', `${baseSlug}%`);

      let finalSlug = baseSlug;
      if (existingSlugs && existingSlugs.length > 0) {
        const slugSet = new Set(existingSlugs.map(s => s.slug));
        let counter = 2;
        while (slugSet.has(finalSlug)) {
          finalSlug = `${baseSlug}-${counter}`;
          counter++;
        }
      }

      const { error } = await supabase
        .from('job_openings')
        .update({
          title,
          description,
          slug: finalSlug,
        })
        .eq('id', activeJobId);

      if (error) throw error;
      
      setJobs(jobs.map((job) =>
        job.id === activeJobId ? { ...job, title, requirements: description, slug: finalSlug } : job
      ));
      
      toast.success("Job saved successfully!");
      setCurrentView("detail");
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to save job");
    }
  };

  const handleBackToList = () => {
    setActiveJobId("");
    setCurrentView("list");
    setSearchParams({});
  };

  const handleEditJob = () => {
    setCurrentView("create");
  };

  const handleDeleteResume = async (id: string) => {
    try {
      const { error } = await supabase
        .from("candidates")
        .delete()
        .eq("id", id);

      if (error) throw error;

      setJobs(jobs.map((job) =>
        job.id === activeJobId
          ? { ...job, resumes: job.resumes.filter((r) => r.id !== id) }
          : job
      ));

      toast.success("Resume deleted successfully");
    } catch (error) {
      console.error("Error deleting resume:", error);
      toast.error("Failed to delete resume");
    }
  };

  const handleUploadResumes = async (files: File[]) => {
    if (!user || !activeJobId) {
      toast.error("Please select a job and ensure you're logged in");
      return;
    }

    const pdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
    if (pdfFiles.length === 0) {
      toast.error("Please upload PDF files only");
      return;
    }

    const queueItems = uploadQueue.addToQueue(pdfFiles);

    const { data: jobData } = await supabase
      .from("job_openings")
      .select("description, title")
      .eq("id", activeJobId)
      .single();

    if (!jobData) {
      toast.error("Job not found");
      queueItems.forEach(item => {
        uploadQueue.updateQueueItem(item.id, { status: 'failed', error: 'Job not found' });
      });
      return;
    }

    const uploadPromises = pdfFiles.map(async (file, index) => {
      const queueItem = queueItems[index];
      
      try {
        const candidateName = file.name.replace('.pdf', '');

        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'extracting', 
          progress: 20 
        });

        const cvText = await extractTextFromPDF(file);

        uploadQueue.updateQueueItem(queueItem.id, { 
          progress: 40 
        });

        const { data: newCandidate, error } = await supabase
          .from("candidates")
          .insert({
            job_id: activeJobId,
            user_id: user.id,
            name: candidateName,
            email: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            cv_rate: 0,
            cv_text: cvText
          })
          .select()
          .single();

        if (error) throw error;

        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'analyzing', 
          progress: 60 
        });

        const { error: analyzeError } = await supabase.functions.invoke('analyze-cv', {
          body: {
            candidate_id: newCandidate.id,
            job_id: activeJobId,
            cv_text: cvText,
            job_description: jobData.description,
            job_title: jobData.title
          }
        });

        if (analyzeError) {
          throw analyzeError;
        }

        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'completed', 
          progress: 100 
        });

        return { success: true, fileName: file.name };

      } catch (error) {
        console.error("Error uploading CV:", error);
        
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'failed', 
          error: error instanceof Error ? error.message : 'Upload failed' 
        });

        return { success: false, fileName: file.name, error };
      }
    });

    const results = await Promise.allSettled(uploadPromises);
    
    const successCount = results.filter(r => r.status === 'fulfilled' && r.value.success).length;
    const failCount = results.length - successCount;
    
    if (successCount > 0) {
      toast.success(`${successCount} CV(s) uploaded successfully${failCount > 0 ? `, ${failCount} failed` : ''}`);
    }
    if (failCount > 0 && successCount === 0) {
      toast.error(`Failed to upload ${failCount} CV(s)`);
    }

    const newResumes: Resume[] = pdfFiles.map((file) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name.replace('.pdf', ''),
      filename: file.name,
      match: 0,
    }));

    setJobs(jobs.map((job) =>
      job.id === activeJobId
        ? { ...job, resumes: [...job.resumes, ...newResumes] }
        : job
    ));
  };

  const startQuestionPolling = async (jobId: string, toastId: string, jobTitle: string) => {
    let pollCount = 0;
    const maxPolls = 60;
    
    const poll = async () => {
      pollCount++;
      
      try {
        const { data, error } = await supabase
          .from("job_openings")
          .select("questions")
          .eq("id", jobId)
          .maybeSingle();
        
        if (error) throw error;
        
        const hasQuestionsNow = data?.questions && Array.isArray(data.questions) && data.questions.length > 0;
        
        if (hasQuestionsNow) {
          toast.success("Questions Generated!", {
            id: toastId,
            description: jobTitle,
            action: {
              label: "Review Questions →",
              onClick: () => navigate(`/questions-review?id=${jobId}`),
            },
            duration: 10000,
          });
          
          setHasQuestions(true);
          
          const { data: jobData } = await supabase
            .from("job_openings")
            .select("*")
            .eq("id", jobId)
            .maybeSingle();
          
          if (jobData) {
            setJobs(prevJobs => prevJobs.map(job => 
              job.id === jobId 
                ? { ...job, questions: (jobData.questions as unknown as Question[]) || [] }
                : job
            ));
          }
          
          return;
        }
        
        if (pollCount >= maxPolls) {
          toast.error("Generation timed out", {
            id: toastId,
            description: "Please try again or check manually",
            duration: 5000,
          });
          return;
        }
        
        setTimeout(poll, 3000);
        
      } catch (error) {
        console.error("Error polling questions:", error);
        toast.error("Failed to check question status", {
          id: toastId,
          description: "Please refresh the page",
        });
      }
    };
    
    poll();
  };

  const handleGenerateQuestions = async () => {
    if (!activeJob?.requirements.trim()) {
      toast.error("Please enter a job description first");
      return;
    }

    try {
      const { data, error } = await supabase.functions.invoke('send-to-n8n', {
        body: {
          job_id: activeJobId,
          title: activeJob.title,
          description: activeJob.requirements,
        },
      });

      if (error) throw error;

      const toastId = `generate-${activeJobId}`;
      toast.loading("Generating Questions...", {
        id: toastId,
        description: `${activeJob.title || "Your job"} • This usually takes 20-60 seconds`,
        duration: Infinity,
      });
      
      startQuestionPolling(activeJobId, toastId, activeJob.title || "Your job");
      
      const questions = generateQuestions(activeJob.requirements);
      
      setJobs(jobs.map((job) =>
        job.id === activeJobId
          ? { ...job, questions }
          : job
      ));

    } catch (error) {
      console.error('Error sending to n8n:', error);
      toast.error("Failed to start question generation");
    }
  };

  const handleGoToDashboard = () => {
    if (activeJobId) {
      navigate(`/candidates-dashboard?id=${activeJobId}`);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <main className="flex-1">
        {currentView === "list" && (
          <JobList
            jobs={jobs}
            onSelectJob={handleSelectJob}
            onCreateJob={handleCreateJob}
            onDeleteJob={handleDeleteJob}
          />
        )}
        
        {currentView === "create" && activeJob && (
          <JobCreateForm
            initialTitle={activeJob.title}
            initialDescription={activeJob.requirements}
            onSave={handleSaveJob}
            onBack={handleBackToList}
          />
        )}
        
        {currentView === "detail" && activeJob && (
          <JobDetailView
            job={activeJob}
            onBack={handleBackToList}
            onSave={handleSaveJob}
            onUploadResumes={handleUploadResumes}
            onDeleteResume={handleDeleteResume}
            onGenerateQuestions={handleGenerateQuestions}
            onGoToDashboard={handleGoToDashboard}
            hasQuestions={hasQuestions}
          />
        )}
      </main>
      <UploadQueue
        queue={uploadQueue.queue}
        isOpen={uploadQueue.isQueueOpen}
        onClose={() => uploadQueue.setIsQueueOpen(false)}
        onClearCompleted={uploadQueue.clearCompleted}
        onClearAll={uploadQueue.clearAll}
      />
    </div>
  );
};

export default Index;
