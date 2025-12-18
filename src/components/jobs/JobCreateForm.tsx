import { useState } from "react";
import { ArrowLeft, Save } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

interface JobCreateFormProps {
  initialTitle?: string;
  initialDescription?: string;
  onSave: (title: string, description: string) => void;
  onBack: () => void;
}

export const JobCreateForm = ({ 
  initialTitle = "", 
  initialDescription = "", 
  onSave, 
  onBack 
}: JobCreateFormProps) => {
  const [title, setTitle] = useState(initialTitle);
  const [description, setDescription] = useState(initialDescription);

  const handleSave = () => {
    if (!title.trim()) {
      return;
    }
    onSave(title.trim(), description.trim());
  };

  return (
    <div className="container mx-auto p-6 max-w-3xl">
      <Button
        variant="ghost"
        onClick={onBack}
        className="mb-6"
      >
        <ArrowLeft className="w-4 h-4 mr-2" />
        Back to jobs
      </Button>

      <Card>
        <CardHeader>
          <CardTitle className="text-2xl">Create New Job Opening</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="job-title">Job Title</Label>
            <Input
              id="job-title"
              placeholder="e.g., Senior Frontend Developer"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-lg"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="job-description">Job Description</Label>
            <Textarea
              id="job-description"
              placeholder="Enter the job requirements, responsibilities, and qualifications..."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="min-h-[300px] resize-none"
            />
          </div>

          <Button
            onClick={handleSave}
            size="lg"
            className="w-full"
            disabled={!title.trim()}
          >
            <Save className="w-5 h-5 mr-2" />
            Save Job Opening
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};
