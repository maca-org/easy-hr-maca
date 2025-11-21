import { Button } from "./ui/button";
import { Textarea } from "./ui/textarea";
import { useState } from "react";

export const JobRequirements = () => {
  const [requirements, setRequirements] = useState("");

  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-muted rounded">⌘5</span>
          <span>Save</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2 text-foreground">
          First, enter a job requirements here ↓
        </h2>
        
        <Textarea
          value={requirements}
          onChange={(e) => setRequirements(e.target.value)}
          placeholder="List required skills and qualifications, location, experience, etc.&#10;Be as descriptive as possible.&#10;Avoid generic or unnecessary information, buzzwords.&#10;&#10;Once you've done this, start uploading resumes on the right →"
          className="min-h-[400px] resize-none border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
};
