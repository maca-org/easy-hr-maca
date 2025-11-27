import { Textarea } from "./ui/textarea";
import { Input } from "./ui/input";
import { Button } from "./ui/button";
import { Check, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
interface JobRequirementsProps {
  title: string;
  requirements: string;
  jobId: string;
  hasQuestions: boolean;
  onUpdateTitle: (title: string) => void;
  onUpdateRequirements: (requirements: string) => void;
  onSave: () => void;
  onGenerateQuestions: () => void;
}
export const JobRequirements = ({
  title,
  requirements,
  jobId,
  hasQuestions,
  onUpdateTitle,
  onUpdateRequirements,
  onSave,
  onGenerateQuestions
}: JobRequirementsProps) => {
  const navigate = useNavigate();
  const handleReviewQuestions = () => {
    navigate(`/questions-review?id=${jobId}`);
  };
  return <div className="flex-1 flex flex-col bg-background">
      

      <div className="flex-1 p-6 overflow-y-auto">
        <h2 className="text-lg font-semibold mb-4 text-foreground">
          Job Opening Details
        </h2>

        <div className="mb-4">
          <label className="block text-sm font-medium mb-2 text-foreground">
            Job Title
          </label>
          <Input value={title} onChange={e => onUpdateTitle(e.target.value)} placeholder="e.g., Senior Software Engineer" className="border-border text-foreground placeholder:text-muted-foreground" />
        </div>

        <div>
          <label className="block text-sm font-medium mb-2 text-foreground">
            Job Description
          </label>
          <Textarea value={requirements} onChange={e => onUpdateRequirements(e.target.value)} placeholder="List required skills, qualifications, location, experience, etc.&#10;Be as detailed as possible.&#10;Avoid general or unnecessary information and jargon.&#10;&#10;Once done, click 'Save & Generate Questions' below." className="min-h-[400px] resize-none border-border text-foreground placeholder:text-muted-foreground" />
        </div>

        <div className="flex justify-end gap-3 mt-4">
          <Button onClick={onSave} disabled={!requirements.trim()} variant="outline" className="gap-2">
            <Check className="w-4 h-4" />
            Save
          </Button>
          <Button onClick={onGenerateQuestions} disabled={!requirements.trim()} className="gap-2">
            Generate Questions
          </Button>
          {hasQuestions && <Button onClick={handleReviewQuestions} variant="secondary" className="gap-2">
              <FileText className="w-4 h-4" />
              Review Questions
            </Button>}
        </div>
      </div>
    </div>;
};