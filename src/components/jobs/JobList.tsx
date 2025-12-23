import { Rocket, Briefcase, Calendar, Users, Trash2, ArrowUpDown, LayoutDashboard, Link as LinkIcon, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState, useMemo } from "react";
import { ShareLinkModal } from "./ShareLinkModal";

interface JobWithSlug extends Job {
  slug?: string | null;
}

interface JobListProps {
  jobs: JobWithSlug[];
  onSelectJob: (id: string) => void;
  onCreateJob: () => void;
  onDeleteJob: (id: string) => void;
}

type SortOption = 'newest' | 'oldest' | 'a-z' | 'z-a';

export const JobList = ({ jobs, onSelectJob, onCreateJob, onDeleteJob }: JobListProps) => {
  const navigate = useNavigate();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [jobToDelete, setJobToDelete] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [shareLinkModalOpen, setShareLinkModalOpen] = useState(false);
  const [selectedJobForShare, setSelectedJobForShare] = useState<JobWithSlug | null>(null);

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

  const handleShareClick = (job: JobWithSlug, e: React.MouseEvent) => {
    e.stopPropagation();
    setSelectedJobForShare(job);
    setShareLinkModalOpen(true);
  };

  const sortedJobs = useMemo(() => {
    return [...jobs].sort((a, b) => {
      switch (sortBy) {
        case 'oldest':
          return new Date(a.date).getTime() - new Date(b.date).getTime();
        case 'newest':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        case 'a-z':
          return (a.title || '').localeCompare(b.title || '');
        case 'z-a':
          return (b.title || '').localeCompare(a.title || '');
        default:
          return 0;
      }
    });
  }, [jobs, sortBy]);

  return (
    <div className="container mx-auto p-6 space-y-8">
      {/* Create New Job Button */}
      <div className="flex flex-col items-center gap-3">
        <Button
          onClick={onCreateJob}
          size="lg"
          className="group h-auto py-4 px-10 text-lg font-semibold bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-xl hover:shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-1 animate-float btn-glow"
        >
          <Rocket className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
          <div className="flex flex-col items-start">
            <span>Start Hiring</span>
            <span className="text-xs font-normal opacity-80">Takes only 2 minutes</span>
          </div>
        </Button>
        <p className="text-sm text-muted-foreground flex items-center gap-2">
          <span className="text-green-500">✓</span> Free to start • No credit card required
        </p>
      </div>

      {/* Existing Jobs List */}
      {jobs.length > 0 && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-foreground">Your Open Positions</h2>
            <Select value={sortBy} onValueChange={(value: SortOption) => setSortBy(value)}>
              <SelectTrigger className="w-44">
                <ArrowUpDown className="w-4 h-4 mr-2" />
                <SelectValue placeholder="Sort by" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="newest">Newest First</SelectItem>
                <SelectItem value="oldest">Oldest First</SelectItem>
                <SelectItem value="a-z">A-Z</SelectItem>
                <SelectItem value="z-a">Z-A</SelectItem>
              </SelectContent>
            </Select>
          </div>
          
          <div className="flex flex-col gap-4">
            {sortedJobs.map((job) => (
              <Card
                key={job.id}
                onClick={() => onSelectJob(job.id)}
                className="w-full cursor-pointer hover:shadow-lg transition-all hover:border-primary/50 group"
              >
                <CardContent className="p-5">
                  <div className="flex items-center justify-between gap-4">
                    {/* Left: Icon + Title */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <div className="p-3 rounded-lg bg-primary/10 shrink-0">
                        <Briefcase className="w-6 h-6 text-primary" />
                      </div>
                      <h3 className="text-lg font-medium truncate">
                        {job.title || "Untitled Job"}
                      </h3>
                    </div>
                    
                    {/* Center: Candidate count (green) + Dashboard button + Date */}
                    <div className="flex items-center gap-4 text-sm shrink-0">
                      {/* Green candidate count */}
                      <div className="flex items-center gap-2 text-green-600 font-medium">
                        <Users className="w-4 h-4" />
                        <span>{job.candidateCount} candidate{job.candidateCount !== 1 ? 's' : ''}</span>
                      </div>
                      
                      {/* Go to Dashboard button */}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/candidates-dashboard?id=${job.id}`);
                        }}
                        className="h-7 text-xs"
                      >
                        <LayoutDashboard className="w-3 h-3 mr-1" />
                        Dashboard
                      </Button>

                      {/* Get Link button */}
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={(e) => handleShareClick(job, e)}
                        className="h-7 text-xs"
                      >
                        <LinkIcon className="w-3 h-3 mr-1" />
                        Get Link
                      </Button>
                      
                      {/* Date */}
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Calendar className="w-4 h-4" />
                        <span>{job.date}</span>
                      </div>
                    </div>
                    
                    {/* Right: Delete button */}
                    <button
                      onClick={(e) => handleDeleteClick(job.id, e)}
                      className="opacity-0 group-hover:opacity-100 transition-opacity p-2 hover:bg-destructive/10 rounded-lg shrink-0"
                    >
                      <Trash2 className="w-5 h-5 text-destructive" />
                    </button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Empty State */}
      {jobs.length === 0 && (
        <div className="text-center py-16 px-4">
          <div className="relative inline-block mb-6">
            <div className="absolute inset-0 bg-primary/20 blur-2xl rounded-full animate-pulse" />
            <div className="relative p-6 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
              <Sparkles className="w-12 h-12 text-primary animate-pulse" />
            </div>
          </div>
          <h3 className="text-2xl font-semibold text-foreground mb-2">Ready to find your next star?</h3>
          <p className="text-muted-foreground max-w-md mx-auto mb-8">
            Post your first job and let AI help you find the perfect candidates. 
            <span className="text-primary font-medium"> It's quick and easy!</span>
          </p>
          <Button
            onClick={onCreateJob}
            size="lg"
            className="group h-auto py-4 px-8 text-base font-semibold bg-gradient-to-r from-primary via-primary/90 to-primary/80 hover:from-primary/90 hover:via-primary/80 hover:to-primary/70 shadow-xl hover:shadow-2xl hover:shadow-primary/25 transition-all duration-300 hover:-translate-y-1 btn-glow"
          >
            <Rocket className="w-5 h-5 mr-2 group-hover:rotate-12 transition-transform duration-300" />
            <span>Post Your First Job</span>
          </Button>
          <div className="mt-6 flex items-center justify-center gap-6 text-sm text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> Free to start
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> AI-powered screening
            </span>
            <span className="flex items-center gap-1.5">
              <span className="text-green-500">✓</span> 2-minute setup
            </span>
          </div>
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

      {/* Share Link Modal */}
      {selectedJobForShare && (
        <ShareLinkModal
          open={shareLinkModalOpen}
          onOpenChange={setShareLinkModalOpen}
          jobId={selectedJobForShare.id}
          jobTitle={selectedJobForShare.title}
          slug={selectedJobForShare.slug}
        />
      )}
    </div>
  );
};
