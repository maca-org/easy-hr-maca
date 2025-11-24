import { Header } from "@/components/Header";
import { JobSidebar } from "@/components/JobSidebar";
import { JobRequirements } from "@/components/JobRequirements";
import { ResumeUpload } from "@/components/ResumeUpload";
import { useState } from "react";
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
  
  // Load jobs from localStorage
  const getStoredJobs = (): Job[] => {
    const stored = localStorage.getItem("hr-screening-jobs");
    return stored ? JSON.parse(stored) : [];
  };

  const [jobs, setJobs] = useState<Job[]>(getStoredJobs());
  const [activeJobId, setActiveJobId] = useState<string>("");

  const activeJob = jobs.find((job) => job.id === activeJobId);

  const updateStoredJobs = (updatedJobs: Job[]) => {
    localStorage.setItem("hr-screening-jobs", JSON.stringify(updatedJobs));
    setJobs(updatedJobs);
  };

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
    const updatedJobs = [...jobs, newJob];
    updateStoredJobs(updatedJobs);
    setActiveJobId(newJob.id);
  };

  const handleUpdateRequirements = (requirements: string) => {
    const updatedJobs = jobs.map((job) =>
      job.id === activeJobId ? { ...job, requirements } : job
    );
    updateStoredJobs(updatedJobs);
  };


  const handleDeleteJob = (id: string) => {
    const updatedJobs = jobs.filter((job) => job.id !== id);
    updateStoredJobs(updatedJobs);
    if (activeJobId === id) {
      setActiveJobId("");
    }
  };

  const handleUploadResumes = (files: File[]) => {
    const newResumes: Resume[] = files.map((file) => ({
      id: Date.now().toString() + Math.random(),
      name: file.name.replace(/\.(pdf|docx?)$/i, ""),
      filename: file.name,
      match: Math.floor(Math.random() * 20) + 70, // Temporary random match
    }));

    const updatedJobs = jobs.map((job) =>
      job.id === activeJobId
        ? { ...job, resumes: [...job.resumes, ...newResumes] }
        : job
    );
    updateStoredJobs(updatedJobs);
  };

  const handleGenerateQuestions = async () => {
    if (!activeJob?.requirements.trim()) {
      toast.error("Please enter a job description first");
      return;
    }

    try {
      // Save to database - this should always succeed
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
      } else {
        // Insert new job
        const { data: newJob, error: insertError } = await supabase
          .from('jobs')
          .insert({
            id: activeJobId,
            description: activeJob.requirements,
          })
          .select()
          .single();

        if (insertError) throw insertError;
        dbJobId = newJob.id;
      }

      // Try to send to n8n - don't let this block the save
      try {
        const { error: n8nError } = await supabase.functions.invoke('send-to-n8n', {
          body: {
            job_id: dbJobId,
            description: activeJob.requirements,
          },
        });

        if (n8nError) {
          console.error('n8n error:', n8nError);
          toast.warning("Saved to DB but n8n webhook failed.");
        } else {
          toast.success("Job Description saved & sent to n8n!");
        }
      } catch (n8nError) {
        console.error('n8n error:', n8nError);
        toast.warning("Saved to DB but n8n webhook failed.");
      }

      // Generate questions
      const questions = generateQuestions(activeJob.requirements);
      
      const updatedJobs = jobs.map((job) =>
        job.id === activeJobId
          ? { ...job, questions }
          : job
      );
      updateStoredJobs(updatedJobs);

      navigate(`/questions-review?id=${activeJobId}`);
    } catch (error) {
      console.error('Error saving job:', error);
      toast.error("Failed to save job description");
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
        />
        {activeJob && (
          <>
            <JobRequirements
              requirements={activeJob.requirements}
              jobId={activeJob.id}
              onUpdateRequirements={handleUpdateRequirements}
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
