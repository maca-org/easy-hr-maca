import { Textarea } from "./ui/textarea";

interface JobRequirementsProps {
  requirements: string;
  onUpdateRequirements: (requirements: string) => void;
}

export const JobRequirements = ({
  requirements,
  onUpdateRequirements,
}: JobRequirementsProps) => {
  return (
    <div className="flex-1 flex flex-col bg-background">
      <div className="flex items-center justify-between px-6 py-4 border-b border-border">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span className="px-2 py-1 bg-muted rounded">⌘S</span>
          <span>Save</span>
        </div>
      </div>

      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-2 text-foreground">
          Enter job description here ↓
        </h2>

        <Textarea
          value={requirements}
          onChange={(e) => onUpdateRequirements(e.target.value)}
          placeholder="List required skills, qualifications, location, experience, etc.&#10;Be as detailed as possible.&#10;Avoid general or unnecessary information and jargon.&#10;&#10;Once done, start uploading resumes from the right side →"
          className="min-h-[400px] resize-none border-border text-foreground placeholder:text-muted-foreground"
        />
      </div>
    </div>
  );
};
