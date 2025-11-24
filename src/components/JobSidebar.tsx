import { Plus, Search, Trash2, Pencil, Check, X } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Job } from "@/pages/Index";
import { useState } from "react";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "./ui/alert-dialog";

interface JobSidebarProps {
  jobs: Job[];
  activeJobId: string;
  onSelectJob: (id: string) => void;
  onAddJob: () => void;
  onDeleteJob: (id: string) => void;
  onRenameJob: (id: string, newTitle: string) => void;
}

export const JobSidebar = ({
  jobs,
  activeJobId,
  onSelectJob,
  onAddJob,
  onDeleteJob,
  onRenameJob,
}: JobSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [editingJobId, setEditingJobId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");

  const filteredJobs = jobs.filter((job) =>
    job.date.toLowerCase().includes(searchQuery.toLowerCase())
  );

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

  const handleEditClick = (job: Job, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingJobId(job.id);
    setEditingTitle(job.title || "Job Description");
  };

  const handleSaveRename = (jobId: string) => {
    if (editingTitle.trim()) {
      onRenameJob(jobId, editingTitle.trim());
    }
    setEditingJobId(null);
    setEditingTitle("");
  };

  const handleCancelEdit = () => {
    setEditingJobId(null);
    setEditingTitle("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, jobId: string) => {
    if (e.key === "Enter") {
      handleSaveRename(jobId);
    } else if (e.key === "Escape") {
      handleCancelEdit();
    }
  };

  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 space-y-4">
        <Button
          onClick={onAddJob}
          className="w-full bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground border border-sidebar-border"
        >
          <Plus className="w-4 h-4 mr-2" />
          New job
        </Button>

        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/60" />
          <Input
            placeholder="Search"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4 space-y-2">
        {filteredJobs.map((job) => (
          <div
            key={job.id}
            onClick={() => onSelectJob(job.id)}
            className={`group p-3 rounded-lg cursor-pointer transition-colors ${
              job.id === activeJobId
                ? "bg-sidebar-accent border border-sidebar-border"
                : "bg-sidebar-accent/50 hover:bg-sidebar-accent/80"
            }`}
          >
            <div className="flex items-start justify-between gap-2 mb-2">
              {editingJobId === job.id ? (
                <div className="flex items-center gap-2 flex-1" onClick={(e) => e.stopPropagation()}>
                  <Input
                    value={editingTitle}
                    onChange={(e) => setEditingTitle(e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, job.id)}
                    className="h-7 text-sm"
                    autoFocus
                  />
                  <button
                    onClick={() => handleSaveRename(job.id)}
                    className="flex-shrink-0"
                  >
                    <Check className="h-4 w-4 text-green-600" />
                  </button>
                  <button
                    onClick={handleCancelEdit}
                    className="flex-shrink-0"
                  >
                    <X className="h-4 w-4 text-destructive" />
                  </button>
                </div>
              ) : (
                <>
                  <h3 className="text-sidebar-foreground font-medium text-sm line-clamp-2 flex-1">
                    {job.title || "Job Description"}
                  </h3>
                  <div className="flex gap-1 flex-shrink-0">
                    <button
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-sidebar-accent/80 rounded"
                      onClick={(e) => handleEditClick(job, e)}
                    >
                      <Pencil className="h-3.5 w-3.5 text-sidebar-foreground/70" />
                    </button>
                    <button
                      className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center hover:bg-sidebar-accent/80 rounded"
                      onClick={(e) => handleDeleteClick(job.id, e)}
                    >
                      <Trash2 className="h-3.5 w-3.5 text-destructive" />
                    </button>
                  </div>
                </>
              )}
            </div>
            <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
              <span>{job.date}</span>
              {job.resumes.length > 0 && (
                <span>{job.resumes.length} resume{job.resumes.length !== 1 ? 's' : ''}</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Job Description?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The job description and all resumes will be deleted.
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
    </aside>
  );
};
