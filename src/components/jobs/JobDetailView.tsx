import { useState, useEffect } from "react";
import { ArrowLeft, Link2, Send, LayoutDashboard, Edit2, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ResumeUpload } from "@/components/ResumeUpload";
import { Job, Resume } from "@/pages/Index";
import { toast } from "sonner";
import { ShareLinkModal } from "./ShareLinkModal";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface JobDetailViewProps {
  job: Job & { slug?: string | null };
  onBack: () => void;
  onSave: (title: string, description: string) => void;
  onUploadResumes: (files: File[]) => void;
  onDeleteResume: (id: string) => void;
  onGenerateQuestions: () => void;
  onGoToDashboard: () => void;
  hasQuestions: boolean;
}

export const JobDetailView = ({
  job,
  onBack,
  onSave,
  onUploadResumes,
  onDeleteResume,
  onGenerateQuestions,
  onGoToDashboard,
  hasQuestions,
}: JobDetailViewProps) => {
  const [isEditing, setIsEditing] = useState(
    !job.title || job.title === "Untitled Job" || !job.requirements
  );
  const [editTitle, setEditTitle] = useState(job.title || "");
  const [editDescription, setEditDescription] = useState(job.requirements || "");
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);

  // Sync state when job changes
  useEffect(() => {
    setEditTitle(job.title || "");
    setEditDescription(job.requirements || "");
    setIsEditing(!job.title || job.title === "Untitled Job" || !job.requirements);
  }, [job.id, job.title, job.requirements]);

  const handleSave = () => {
    if (!editTitle.trim()) {
      toast.error("Please enter a job title");
      return;
    }
    onSave(editTitle.trim(), editDescription.trim());
    setIsEditing(false);
  };

  const handleOpenShareModal = () => {
    setShareLinkModalOpen(true);
  };

  const handlePublish = () => {
    if (!hasQuestions) {
      onGenerateQuestions();
    } else {
      toast.success("Job opening is ready to receive applications!");
    }
  };

  const isJobComplete = job.title && job.title !== "Untitled Job" && job.requirements;
  const [showExitDialog, setShowExitDialog] = useState(false);

  const hasUnsavedChanges = () => {
    const titleChanged = editTitle.trim() !== (job.title || "");
    const descChanged = editDescription.trim() !== (job.requirements || "");
    return isEditing && (titleChanged || descChanged) && (editTitle.trim() || editDescription.trim());
  };

  const handleBack = () => {
    if (isJobComplete) {
      onGoToDashboard();
    } else if (hasUnsavedChanges()) {
      setShowExitDialog(true);
    } else {
      onBack();
    }
  };

  const confirmExit = () => {
    setShowExitDialog(false);
    onBack();
  };

  return (
    <div className="container mx-auto p-6 space-y-6 max-w-4xl">
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
        >
          <ArrowLeft className="w-4 h-4 mr-2" />
          {isJobComplete ? "Go to Dashboard" : "Back to jobs"}
        </Button>
      </div>

      {/* Job Summary Card */}
      <Card className={isEditing ? "border-primary/50 shadow-lg" : ""}>
        <CardHeader className={isEditing ? "p-8" : "p-6"}>
          {isEditing ? (
            <div className="space-y-6">
              <Input
                placeholder="Job Title"
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                className="text-2xl font-semibold h-14 px-4"
              />
              <Textarea
                placeholder="Job Description / Requirements"
                value={editDescription}
                onChange={(e) => setEditDescription(e.target.value)}
                rows={12}
                className="text-base min-h-[300px] p-4"
              />
              <Button onClick={handleSave} size="lg" className="h-12 px-6">
                <Save className="w-5 h-5 mr-2" />
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <CardTitle className="text-xl">{job.title}</CardTitle>
                <p className="text-xs text-muted-foreground mt-1">Created on {job.date}</p>
                <p className="text-sm text-muted-foreground mt-2 whitespace-pre-wrap line-clamp-3">
                  {job.requirements}
                </p>
              </div>
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Edit2 className="w-4 h-4" />
              </Button>
            </div>
          )}
        </CardHeader>
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
            onGetApplicationLink={handleOpenShareModal}
          />
        </CardContent>
      </Card>

      {/* Action Buttons */}
      {/* Share Link Modal */}
      <ShareLinkModal
        open={shareLinkModalOpen}
        onOpenChange={setShareLinkModalOpen}
        jobId={job.id}
        jobTitle={job.title}
        slug={job.slug}
      />

      {/* Exit Confirmation Dialog */}
      <AlertDialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unsaved Changes</AlertDialogTitle>
            <AlertDialogDescription>
              You have unsaved changes. Are you sure you want to leave? Your changes will be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Stay</AlertDialogCancel>
            <AlertDialogAction onClick={confirmExit} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Leave
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Action Buttons */}
      <div className="flex justify-center">
        <Button
          variant={hasQuestions ? "outline" : "default"}
          size="lg"
          onClick={handlePublish}
          className="h-14 w-full max-w-md"
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
