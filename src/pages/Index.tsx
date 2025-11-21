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
  const [jobs, setJobs] = useState<Job[]>([
    {
      id: "1",
      title: "Junior Business Analyst",
      date: "20 Nov 2025",
      requirements: "",
      resumes: [
        { id: "1", name: "Naor Stella", filename: "Stella CV 2023.pdf", match: 79 },
        { id: "2", name: "Raphael Suarez", filename: "RaphSuarez_CV_.pdf", match: 79 },
        { id: "3", name: "Henry Lee", filename: "Henry Lee - CV.pdf", match: 79 },
        { id: "4", name: "Jennifer Diaz", filename: "JenD Resume.pdf", match: 78 },
        { id: "5", name: "Mia Sha", filename: "", match: 76 },
      ],
    },
  ]);
  const [activeJobId, setActiveJobId] = useState<string>("1");

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
        />
        {activeJob && (
          <>
            <JobRequirements
              requirements={activeJob.requirements}
              onUpdateRequirements={handleUpdateRequirements}
            />
            <ResumeUpload resumes={activeJob.resumes} />
          </>
        )}
      </div>
    </div>
  );
};

export default Index;
