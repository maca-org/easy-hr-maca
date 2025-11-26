import { Header } from "@/components/Header";
import { JobSidebar } from "@/components/JobSidebar";
import { JobRequirements } from "@/components/JobRequirements";
import { ResumeUpload } from "@/components/ResumeUpload";
import { useState, useEffect } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { generateQuestions } from "@/utils/questionGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { User } from "@supabase/supabase-js";

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

  const handleAddJob = () => {
    const newJob: Job = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      title: "",
      requirements: "",
      resumes: [],
      questions: [],
    };
    setJobs([...jobs, newJob]);
    setActiveJobId(newJob.id);
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

    const newResumes: Resume[] = files.map((file) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name.replace(/\.(pdf|docx?)$/i, ""),
      filename: file.name,
      match: 0, // Will be updated after analysis
    }));

    // Save candidates to database and trigger CV analysis
    try {
      const candidatesData = await Promise.all(
        files.map(async (file, index) => {
          // Upload CV file to storage
          const filePath = `${user.id}/${dbJobId}/${Date.now()}_${file.name}`;
          const { error: uploadError } = await supabase.storage
            .from('cv-files')
            .upload(filePath, file);

          if (uploadError) {
            console.error('Error uploading CV file:', uploadError);
            throw uploadError;
          }

          return {
            name: newResumes[index].name,
            email: `${newResumes[index].name.toLowerCase().replace(/\s+/g, '.')}@example.com`,
            job_id: dbJobId,
            user_id: user.id,
            cv_rate: 0,
            completed_test: false,
            cv_file_path: filePath,
          };
        })
      );

      const { data: insertedCandidates, error } = await supabase
        .from("candidates")
        .insert(candidatesData)
        .select();

      if (error) throw error;

      toast.success(`${files.length} candidate(s) added successfully. Analyzing CVs...`);

      // Update local state
      setJobs(jobs.map((job) =>
        job.id === dbJobId
          ? { ...job, resumes: [...job.resumes, ...newResumes] }
          : job
      ));

      // Convert PDFs to base64 and trigger analysis for each
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const candidate = insertedCandidates?.[i];
        
        if (!candidate) continue;

        try {
          // Convert PDF to base64
          const reader = new FileReader();
          const base64Promise = new Promise<string>((resolve, reject) => {
            reader.onload = () => {
              const base64 = reader.result as string;
              // Remove data:application/pdf;base64, prefix
              const base64Data = base64.split(',')[1];
              resolve(base64Data);
            };
            reader.onerror = reject;
          });
          
          reader.readAsDataURL(file);
          const cv_base64 = await base64Promise;

          // Trigger CV analysis with Lovable AI
          const { error: analysisError } = await supabase.functions.invoke('analyze-cv-with-ai', {
            body: {
              candidate_id: candidate.id,
              job_id: dbJobId,
              cv_base64,
              job_description: activeJob?.requirements || '',
            },
          });

          if (analysisError) {
            console.error('Error analyzing CV for candidate:', candidate.name, analysisError);
            toast.error(`Failed to analyze CV for ${candidate.name}`);
          }
        } catch (conversionError) {
          console.error('Error converting PDF to base64:', conversionError);
          toast.error(`Failed to process CV for ${file.name}`);
        }
      }

      toast.success('CV analysis started. Results will be available shortly.');
    } catch (error) {
      console.error("Error saving candidates:", error);
      toast.error("Failed to save candidates");
    }
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
      // Save to database
      const { data: existingJob } = await supabase
        .from('job_openings')
        .select('id')
        .eq('id', activeJobId)
        .maybeSingle();

      let dbJobId = activeJobId;

      if (existingJob) {
        // Update existing job
        const { error: updateError } = await supabase
          .from('job_openings')
          .update({
            title: activeJob.title,
            description: activeJob.requirements,
          })
          .eq('id', activeJobId);

        if (updateError) throw updateError;
        
        // Update state with saved data
        setJobs(jobs.map((job) =>
          job.id === activeJobId ? { ...job, title: activeJob.title, requirements: activeJob.requirements } : job
        ));
      } else {
        // Insert new job with user_id
        const { data: newJob, error: insertError } = await supabase
          .from('job_openings')
          .insert({
            title: activeJob.title,
            description: activeJob.requirements,
            user_id: user.id,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        dbJobId = newJob.id;
        
        // Update state with the database-generated ID and created_at date
        setJobs(jobs.map((job) =>
          job.id === activeJobId 
            ? { 
                ...job,
                id: newJob.id,
                title: newJob.title || "",
                date: new Date(newJob.created_at).toLocaleDateString("en-GB", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
              } 
            : job
        ));
        
        // Update activeJobId to the database-generated ID
        setActiveJobId(newJob.id);
      }

      toast.success("Job Description saved!");
      return dbJobId; // Return the database ID
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
          <>
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
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
