import { Plus, Search } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";

interface Job {
  id: string;
  title: string;
  date: string;
  resumeCount: number;
}

const mockJobs: Job[] = [
  {
    id: "1",
    title: "Junior Business Analyst",
    date: "20 Nov 2025",
    resumeCount: 5,
  },
];

export const JobSidebar = () => {
  return (
    <aside className="w-64 bg-sidebar border-r border-sidebar-border flex flex-col">
      <div className="p-4 space-y-4">
        <Button 
          className="w-full bg-sidebar-accent hover:bg-sidebar-accent/80 text-sidebar-accent-foreground border border-sidebar-border"
        >
          <Plus className="w-4 h-4 mr-2" />
          New job
        </Button>
        
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-sidebar-foreground/60" />
          <Input 
            placeholder="Search" 
            className="pl-9 bg-sidebar-accent border-sidebar-border text-sidebar-foreground placeholder:text-sidebar-foreground/60"
          />
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 pb-4">
        {mockJobs.map((job) => (
          <div
            key={job.id}
            className="p-3 rounded-lg bg-sidebar-accent hover:bg-sidebar-accent/80 cursor-pointer transition-colors"
          >
            <h3 className="text-sidebar-foreground font-medium text-sm line-clamp-2 mb-2">
              {job.title}
            </h3>
            <div className="flex items-center justify-between text-xs text-sidebar-foreground/70">
              <span>{job.date}</span>
              <span>{job.resumeCount} resumes</span>
            </div>
          </div>
        ))}
      </div>
    </aside>
  );
};
