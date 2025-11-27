import { Header } from "@/components/Header";
import { JobSidebar } from "@/components/JobSidebar";
import { JobRequirements } from "@/components/JobRequirements";
import { ResumeUpload } from "@/components/ResumeUpload";
import { UploadQueue } from "@/components/UploadQueue";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateQuestions } from "@/utils/questionGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { extractTextFromPDF } from "@/utils/pdfExtractor";
import { useUploadQueue } from "@/hooks/useUploadQueue";

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
}

const Index = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  
  const [user, setUser] = useState<User | null>(null);
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("");
  const [hasQuestions, setHasQuestions] = useState<boolean>(false);
  const [uploading, setUploading] = useState(false);
  const uploadQueue = useUploadQueue();
  const [candidatesStats, setCandidatesStats] = useState({
    cvAbove80: 0,
    cvBelow80: 0,
    testAbove80: 0,
    testBelow80: 0,
    completed: 0,
    pending: 0,
  });

  const activeJob = jobs.find((job) => job.id === activeJobId);

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
        }));
        setJobs(mappedJobs);
        
        // Set active job from URL parameter if present
        const jobIdFromUrl = searchParams.get("id");
        if (jobIdFromUrl && mappedJobs.some(job => job.id === jobIdFromUrl)) {
          setActiveJobId(jobIdFromUrl);
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

      // Only query database with valid UUIDs (not timestamp IDs)
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

  // Fetch candidates stats for active job
  useEffect(() => {
    const fetchCandidatesStats = async () => {
      if (!activeJobId) {
        setCandidatesStats({
          cvAbove80: 0,
          cvBelow80: 0,
          testAbove80: 0,
          testBelow80: 0,
          completed: 0,
          pending: 0,
        });
        return;
      }

      const { data, error } = await supabase
        .from("candidates")
        .select("cv_rate, test_result, completed_test")
        .eq("job_id", activeJobId);

      if (error) {
        console.error("Error fetching candidates:", error);
        return;
      }

      if (data) {
        setCandidatesStats({
          cvAbove80: data.filter(c => c.cv_rate >= 80).length,
          cvBelow80: data.filter(c => c.cv_rate < 80).length,
          testAbove80: data.filter(c => c.test_result && c.test_result >= 80).length,
          testBelow80: data.filter(c => c.test_result && c.test_result < 80).length,
          completed: data.filter(c => c.completed_test).length,
          pending: data.filter(c => !c.completed_test).length,
        });
      }
    };

    fetchCandidatesStats();
  }, [activeJobId]);

  // Scroll to job description if hash is present
  useEffect(() => {
    if (window.location.hash === '#job-description') {
      setTimeout(() => {
        document.getElementById('job-description')?.scrollIntoView({ 
          behavior: 'smooth',
          block: 'start'
        });
      }, 100);
    }
  }, [activeJobId]);

  const handleAddJob = async () => {
    if (!user) {
      toast.error("You must be logged in to create jobs");
      return;
    }

    try {
      // Create job directly in database to get proper UUID
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
      };

      setJobs([...jobs, jobObj]);
      setActiveJobId(newJob.id);
      toast.success("New job created");
    } catch (error) {
      console.error("Error creating job:", error);
      toast.error("Failed to create job");
    }
  };

  const handleUpdateRequirements = (requirements: string) => {
    setJobs(jobs.map((job) =>
      job.id === activeJobId ? { ...job, requirements } : job
    ));
  };

  const handleUpdateTitle = (title: string) => {
    setJobs(jobs.map((job) =>
      job.id === activeJobId ? { ...job, title } : job
    ));
  };


  const handleDeleteJob = async (id: string) => {
    // Delete from Supabase
    const { error } = await supabase
      .from("job_openings")
      .delete()
      .eq("id", id);

    if (error) {
      console.error("Error deleting job:", error);
      toast.error("Failed to delete job");
      return;
    }

    // Update state
    setJobs(jobs.filter((job) => job.id !== id));
    if (activeJobId === id) {
      setActiveJobId("");
    }
    toast.success("Job deleted successfully");
  };

  const handleRenameJob = async (id: string, newTitle: string) => {
    // Update in Supabase
    const { error } = await supabase
      .from("job_openings")
      .update({ title: newTitle })
      .eq("id", id);

    if (error) {
      console.error("Error renaming job:", error);
      toast.error("Failed to rename job");
      return;
    }

    // Update state
    setJobs(jobs.map((job) =>
      job.id === id ? { ...job, title: newTitle } : job
    ));
    toast.success("Job renamed successfully");
  };

  const handleUploadResumes = async (files: File[]) => {
    if (!user || !activeJobId) {
      toast.error("Please select a job and ensure you're logged in");
      return;
    }

    // Ensure job is saved to database first
    const dbJobId = await handleSave();
    if (!dbJobId) {
      toast.error("Failed to save job before uploading resumes");
      return;
    }

    const pdfFiles = Array.from(files).filter(file => file.type === "application/pdf");
    if (pdfFiles.length === 0) {
      toast.error("Please upload PDF files only");
      return;
    }

    // Add files to queue
    const queueItems = uploadQueue.addToQueue(pdfFiles);
    setUploading(true);

    // Fetch job description
    const { data: jobData } = await supabase
      .from("job_openings")
      .select("description, title")
      .eq("id", dbJobId)
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
        const candidateName = file.name.replace('.pdf', '');

        // Update queue: extracting
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'extracting', 
          progress: 20 
        });

        // Extract text from PDF
        const cvText = await extractTextFromPDF(file);

        // Update queue: extracted
        uploadQueue.updateQueueItem(queueItem.id, { 
          progress: 40 
        });

        // Insert candidate into database
        const { data: newCandidate, error } = await supabase
          .from("candidates")
          .insert({
            job_id: dbJobId,
            user_id: user.id,
            name: candidateName,
            email: `${candidateName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            cv_rate: 0,
            cv_text: cvText
          })
          .select()
          .single();

        if (error) throw error;

        // Update queue: analyzing
        uploadQueue.updateQueueItem(queueItem.id, { 
          status: 'analyzing', 
          progress: 60 
        });

        // Call analyze-cv edge function
        const { error: analyzeError } = await supabase.functions.invoke('analyze-cv', {
          body: {
            candidate_id: newCandidate.id,
            job_id: dbJobId,
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

    // Update local state
    const newResumes: Resume[] = pdfFiles.map((file) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name.replace('.pdf', ''),
      filename: file.name,
      match: 0,
    }));

    setJobs(jobs.map((job) =>
      job.id === dbJobId
        ? { ...job, resumes: [...job.resumes, ...newResumes] }
        : job
    ));
  };

  const handleSave = async () => {
    if (!activeJob?.requirements.trim()) {
      toast.error("Please enter a job description first");
      return null;
    }

    if (!user) {
      toast.error("You must be logged in to save jobs");
      return null;
    }

    try {
      // Job already exists in DB (created by handleAddJob), just update it
      const { error: updateError } = await supabase
        .from('job_openings')
        .update({
          title: activeJob.title,
          description: activeJob.requirements,
        })
        .eq('id', activeJobId);

      if (updateError) throw updateError;
      
      toast.success("Job description saved!");
      return activeJobId;
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to save job description");
      return null;
    }
  };

  const handleGenerateQuestions = async () => {
    if (!activeJob?.requirements.trim()) {
      toast.error("Please enter a job description first");
      return;
    }

    // First save to DB and get the database ID
    const dbJobId = await handleSave();
    
    if (!dbJobId) {
      toast.error("Failed to save job before generating questions");
      return;
    }

    try {
      // Send to n8n webhook with the correct database ID
      const { data, error } = await supabase.functions.invoke('send-to-n8n', {
        body: {
          job_id: dbJobId,
          title: activeJob.title,
          description: activeJob.requirements,
        },
      });

      if (error) throw error;

      toast.success("Job sent to n8n successfully");
      
      // Generate questions locally as well
      const questions = generateQuestions(activeJob.requirements);
      
      setJobs(jobs.map((job) =>
        job.id === dbJobId
          ? { ...job, questions }
          : job
      ));

      // Navigate with the correct database ID
      navigate(`/questions-review?id=${dbJobId}`);
    } catch (error) {
      console.error('Error sending to n8n:', error);
      toast.error("Failed to send to n8n");
    }
  };

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <JobSidebar
          jobs={jobs}
          activeJobId={activeJobId}
          onSelectJob={setActiveJobId}
          onAddJob={handleAddJob}
          onDeleteJob={handleDeleteJob}
          onRenameJob={handleRenameJob}
        />
        {activeJob && (
          <div className="flex-1 overflow-auto">
            <div className="container mx-auto p-6 space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-3 gap-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    CV Rating
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <div className="space-y-1">
                    <div className="flex justify-between text-sm">
                      <span>Above 80%:</span>
                      <span className="font-semibold text-green-600">{candidatesStats.cvAbove80}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Below 80%:</span>
                      <span className="font-semibold text-yellow-600">{candidatesStats.cvBelow80}</span>
                    </div>
                  </div>
                  <Button
                    onClick={() => {
                      document.querySelector('.lg\\:grid-cols-2')?.scrollIntoView({ 
                        behavior: 'smooth',
                        block: 'start'
                      });
                    }}
                    variant="outline"
                    size="sm"
                    className="w-full"
                  >
                    View Job Description
                  </Button>
                </CardContent>
              </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      Test Results
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Above 80%:</span>
                        <span className="font-semibold text-green-600">{candidatesStats.testAbove80}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Below 80%:</span>
                        <span className="font-semibold text-yellow-600">{candidatesStats.testBelow80}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => navigate(`/questions-review?id=${activeJobId}`)}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Send Candidate Test
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">
                      AI Pre-Interview
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span>Completed:</span>
                        <span className="font-semibold text-green-600">{candidatesStats.completed}</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span>Pending:</span>
                        <span className="font-semibold text-yellow-600">{candidatesStats.pending}</span>
                      </div>
                    </div>
                    <Button
                      onClick={() => {}}
                      variant="outline"
                      size="sm"
                      className="w-full"
                    >
                      Make Pre-Interviews
                    </Button>
                  </CardContent>
                </Card>
              </div>

              {/* Dashboard Button */}
              <Button
                onClick={() => navigate(`/candidates-dashboard?id=${activeJob.id}`)}
                variant="default"
                size="lg"
                className="w-full"
              >
                View Candidates Dashboard
              </Button>

              {/* Job Editor */}
              <div id="job-description" className="grid grid-cols-1 lg:grid-cols-2 gap-6 scroll-mt-6">
                <JobRequirements
                  title={activeJob.title}
                  requirements={activeJob.requirements}
                  jobId={activeJob.id}
                  hasQuestions={hasQuestions}
                  onUpdateTitle={handleUpdateTitle}
                  onUpdateRequirements={handleUpdateRequirements}
                  onSave={handleSave}
                  onGenerateQuestions={handleGenerateQuestions}
                />
                <ResumeUpload
                  resumes={activeJob.resumes}
                  onUploadResumes={handleUploadResumes}
                />
              </div>
            </div>
          </div>
        )}
      </div>
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
