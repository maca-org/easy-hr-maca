import { Plus, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Job } from "@/pages/Index";
import { useState } from "react";

interface JobSidebarProps {
  jobs: Job[];
  activeJobId: string;
  onSelectJob: (id: string) => void;
  onAddJob: () => void;
  onUpdateJobTitle: (id: string, title: string) => void;
}

export const JobSidebar = ({
  jobs,
  activeJobId,
  onSelectJob,
  onAddJob,
  onUpdateJobTitle,
}: JobSidebarProps) => {
  const [searchQuery, setSearchQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState("");

  const filteredJobs = jobs.filter((job) =>
    job.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDoubleClick = (job: Job) => {
    setEditingId(job.id);
    setEditTitle(job.title);
  };

  const handleTitleSave = (id: string) => {
    if (editTitle.trim()) {
      onUpdateJobTitle(id, editTitle.trim());
    }
    setEditingId(null);
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
            onDoubleClick={() => handleDoubleClick(job)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              job.id === activeJobId
                ? "bg-sidebar-accent border border-sidebar-border"
                : "bg-sidebar-accent/50 hover:bg-sidebar-accent/80"
            }`}
          >
            {editingId === job.id ? (
              <Input
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => handleTitleSave(job.id)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") handleTitleSave(job.id);
                  if (e.key === "Escape") setEditingId(null);
                }}
                autoFocus
                className="h-8 text-sm"
              />
            ) : (
              <>
                <h3 className="text-sidebar-foreground font-medium text-sm line-clamp-2 mb-2">
                  {job.title}
                </h3>
                <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
                  <span>{job.date}</span>
                  <span>{job.resumes.length} resumes</span>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </aside>
  );
};
