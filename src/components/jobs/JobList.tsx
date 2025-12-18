import { Plus, Briefcase, Calendar, FileText, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Job } from "@/pages/Index";
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
import { useState } from "react";

interface JobListProps {
  jobs: Job[];
  onSelectJob: (id: string) => void;
  onCreateJob: () => void;
  onDeleteJob: (id: string) => void;
}

export const JobList = ({ jobs, onSelectJob, onCreateJob, onDeleteJob }: JobListProps) => {
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);

  const handleDeleteClick = (jobId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setJobToDelete(jobId);
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = () => {
    if (jobToDelete) {
      onDeleteJob(jobToDelete);
    }
    setDeleteDialogOpen(false);
    setJobToDelete(null);
  };

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Create New Job Button */}
      <div className="flex justify-center">
        <Button
          onClick={onCreateJob}
          size="lg"
          className="h-20 px-12 text-lg font-semibold bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 shadow-lg"
        >
          <Plus className="w-6 h-6 mr-3" />
          Create a new job
        </Button>
      </div>

      {/* Existing Jobs Grid */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-xl font-semibold text-foreground">Your Open Positions</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {jobs.map((job) => (
              <Card
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group relative"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Briefcase className="w-5 h-5 text-primary" />
                      </div>
                      <CardTitle className="text-base font-medium line-clamp-2">
                        {job.title || "Untitled Job"}
                      </CardTitle>
                    </div>
                    <button
                      onClick={(e) => handleDeleteClick(job.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/10 rounded-lg"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </CardHeader>
                <CardContent className="pt-0">
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Calendar className="w-4 h-4" />
                      <span>{job.date}</span>
                    </div>
                    {job.resumes.length > 0 && (
                      <div className="flex items-center gap-1.5">
                        <FileText className="w-4 h-4" />
                        <span>{job.resumes.length} resume{job.resumes.length !== 1 ? 's' : ''}</span>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="text-center py-12">
          <Briefcase className="w-16 h-16 mx-auto text-muted-foreground/50 mb-4" />
          <h3 className="text-lg font-medium text-muted-foreground">No job openings yet</h3>
          <p className="text-sm text-muted-foreground/70 mt-1">
            Create your first job opening to start screening candidates
          </p>
        </div>
      )}

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Opening?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The job opening and all associated candidates will be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
