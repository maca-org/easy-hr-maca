import { ArrowLeft, Link2, Send, LayoutDashboard, Edit2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Job, Resume } from "@/pages/Index";
import { toast } from "sonner";

interface JobDetailViewProps {
  job: Job;
  onBack: () => void;
  onEdit: () => void;
  onUploadResumes: (files: File[]) => void;
  onDeleteResume: (id: string) => void;
  onGenerateQuestions: () => void;
  onGoToDashboard: () => void;
  hasQuestions: boolean;
}

export const JobDetailView = ({
  job,
  onBack,
  onEdit,
  onUploadResumes,
  onDeleteResume,
  onGenerateQuestions,
  onGoToDashboard,
  hasQuestions,
}: JobDetailViewProps) => {
  const handleCopyLink = () => {
    const link = `${window.location.origin}/assessment?job=${job.id}`;
    navigator.clipboard.writeText(link);
    toast.success("Job opening link copied to clipboard!");
  };

  const handlePublish = () => {
    if (!hasQuestions) {
      onGenerateQuestions();
    } else {
      toast.success("Job opening is ready to receive applications!");
    }
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={onBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to jobs
        </Button>
        <Button
          variant="outline"
          onClick={onEdit}
        >
          <Edit2 className="w-4 h-4 mr-2" />
          Edit Job
        </Button>
      </div>

      {/* Job Summary Card */}
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">{job.title || "Untitled Job"}</CardTitle>
          <p className="text-sm text-muted-foreground">Created on {job.date}</p>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground line-clamp-3">
            {job.requirements || "No description provided"}
          </p>
        </CardContent>
      </Card>

      {/* CV Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle>Upload Candidate CVs</CardTitle>
          <p className="text-sm text-muted-foreground">
            Drag and drop PDF files to upload candidate resumes for AI analysis
          </p>
        </CardHeader>
        <CardContent>
          <ResumeUpload
            resumes={job.resumes}
            onUploadResumes={onUploadResumes}
            onDeleteResume={onDeleteResume}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button
          variant="outline"
          size="lg"
          onClick={handleCopyLink}
          className="h-14"
        >
          <Link2 className="w-5 h-5 mr-2" />
          Get Job Opening Link
        </Button>
        <Button
          variant={hasQuestions ? "outline" : "default"}
          size="lg"
          onClick={handlePublish}
          className="h-14"
        >
          <Send className="w-5 h-5 mr-2" />
          {hasQuestions ? "Job Published" : "Publish Job Opening"}
        </Button>
      </div>

      {/* Go to Dashboard Button */}
      <Button
        onClick={onGoToDashboard}
        size="lg"
        className="w-full h-16 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
      >
        <LayoutDashboard className="w-6 h-6 mr-3" />
        Go to Dashboard
      </Button>
    </div>
  );
};
