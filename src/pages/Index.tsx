import { Header } from "@/components/Header";
import { JobSidebar } from "@/components/JobSidebar";
import { JobRequirements } from "@/components/JobRequirements";
import { ResumeUpload } from "@/components/ResumeUpload";

const Index = () => {
  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 flex overflow-hidden">
        <JobSidebar />
        <JobRequirements />
        <ResumeUpload />
      </div>
    </div>
  );
};

export default Index;
