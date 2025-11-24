import { Header } from "@/components/Header";
import { JobSidebar } from "@/components/JobSidebar";
import { JobRequirements } from "@/components/JobRequirements";
import { ResumeUpload } from "@/components/ResumeUpload";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { generateQuestions } from "@/utils/questionGenerator";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

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
}

export interface Job {
  id: string;
  date: string;
  requirements: string;
  resumes: Resume[];
  questions: Question[];
}

const Index = () => {
  const navigate = useNavigate();
  
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("");

  const activeJob = jobs.find((job) => job.id === activeJobId);

  // Load jobs from Supabase on mount
  useEffect(() => {
    const fetchJobs = async () => {
      const { data, error } = await supabase
        .from("jobs")
        .select("*")
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
          requirements: row.description,
          resumes: [],
          questions: [],
        }));
        setJobs(mappedJobs);
      }
    };

    fetchJobs();
  }, []);

  const handleAddJob = () => {
    const newJob: Job = {
      id: Date.now().toString(),
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
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


  const handleDeleteJob = async (id: string) => {
    // Delete from Supabase
    const { error } = await supabase
      .from("jobs")
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

  const handleUploadResumes = (files: File[]) => {
    const newResumes: Resume[] = files.map((file) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name.replace(/\.(pdf|docx?)$/i, ""),
      filename: file.name,
      match: Math.floor(Math.random() * 20) + 70, // Temporary random match
    }));

    setJobs(jobs.map((job) =>
      job.id === activeJobId
        ? { ...job, resumes: [...job.resumes, ...newResumes] }
        : job
    ));
  };

  const handleSave = async () => {
    if (!activeJob?.requirements.trim()) {
      toast.error("Please enter a job description first");
      return;
    }

    try {
      // Save to database
      const { data: existingJob } = await supabase
        .from('jobs')
        .select('id')
        .eq('id', activeJobId)
        .maybeSingle();

      let dbJobId = activeJobId;

      if (existingJob) {
        // Update existing job
        const { error: updateError } = await supabase
          .from('jobs')
          .update({
            description: activeJob.requirements,
          })
          .eq('id', activeJobId);

        if (updateError) throw updateError;
        
        // Update state with saved data
        setJobs(jobs.map((job) =>
          job.id === activeJobId ? { ...job, requirements: activeJob.requirements } : job
        ));
      } else {
        // Insert new job
        const { data: newJob, error: insertError } = await supabase
          .from('jobs')
          .insert({
            description: activeJob.requirements,
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
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to save job description");
    }
  };

  const handleGenerateQuestions = async () => {
    if (!activeJob?.requirements.trim()) {
      toast.error("Please enter a job description first");
      return;
    }

    // First save to DB
    await handleSave();

    // Generate questions
    const questions = generateQuestions(activeJob.requirements);
    
    setJobs(jobs.map((job) =>
      job.id === activeJobId
        ? { ...job, questions }
        : job
    ));

    navigate(`/questions-review?id=${activeJobId}`);
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
        />
        {activeJob && (
          <>
            <JobRequirements
              requirements={activeJob.requirements}
              jobId={activeJob.id}
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
