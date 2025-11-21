import { Header } from "@/components/Header";
import { JobSidebar } from "@/components/JobSidebar";
import { JobRequirements } from "@/components/JobRequirements";
import { ResumeUpload } from "@/components/ResumeUpload";
import { useState } from "react";

export interface Resume {
  id: string;
  name: string;
  filename: string;
  match: number;
}

export interface Job {
  id: string;
  title: string;
  date: string;
  requirements: string;
  resumes: Resume[];
}

const Index = () => {
  const [jobs, setJobs] = useState<Job[]>([]);
  const [activeJobId, setActiveJobId] = useState<string>("");

  const activeJob = jobs.find((job) => job.id === activeJobId);

  const handleAddJob = () => {
    const newJob: Job = {
      id: Date.now().toString(),
      title: "New Job Position",
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      requirements: "",
      resumes: [],
    };
    setJobs([...jobs, newJob]);
    setActiveJobId(newJob.id);
  };

  const handleUpdateRequirements = (requirements: string) => {
    setJobs(
      jobs.map((job) =>
        job.id === activeJobId ? { ...job, requirements } : job
      )
    );
  };

  const handleUpdateJobTitle = (id: string, title: string) => {
    setJobs(jobs.map((job) => (job.id === id ? { ...job, title } : job)));
  };

  const handleDeleteJob = (id: string) => {
    setJobs(jobs.filter((job) => job.id !== id));
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

    setJobs(
      jobs.map((job) =>
        job.id === activeJobId
          ? { ...job, resumes: [...job.resumes, ...newResumes] }
          : job
      )
    );
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
          onUpdateJobTitle={handleUpdateJobTitle}
          onDeleteJob={handleDeleteJob}
        />
        {activeJob && (
          <>
            <JobRequirements
              requirements={activeJob.requirements}
              onUpdateRequirements={handleUpdateRequirements}
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
