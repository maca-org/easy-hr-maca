import { Upload, FileText } from "lucide-react";
import { useState } from "react";
import { Resume } from "@/pages/Index";

interface ResumeUploadProps {
  resumes: Resume[];
  onUploadResumes: (files: File[]) => void;
}

export const ResumeUpload = ({ resumes, onUploadResumes }: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).filter(
      (file) => file.type === "application/pdf"
    );
    if (fileArray.length > 0) {
      onUploadResumes(fileArray);
    }
  };

  return (
    <div className="w-96 bg-background border-l border-border flex flex-col">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto">
        <div
          className={`border-2 border-dashed rounded-lg text-center transition-all cursor-pointer ${
            resumes.length > 0 ? "p-4" : "p-8"
          } ${
            isDragging
              ? "border-primary bg-primary/5"
              : "border-border bg-muted/30"
          }`}
          onDragOver={(e) => {
            e.preventDefault();
            setIsDragging(true);
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setIsDragging(false);
            handleFiles(e.dataTransfer.files);
          }}
          onClick={() => document.getElementById("file-upload")?.click()}
        >
          <input
            id="file-upload"
            type="file"
            multiple
            accept=".pdf"
            className="hidden"
            onChange={(e) => handleFiles(e.target.files)}
          />
          <Upload className={`text-primary mx-auto ${resumes.length > 0 ? "w-8 h-8 mb-2" : "w-12 h-12 mb-4"}`} />
          <h3 className={`font-semibold text-foreground ${resumes.length > 0 ? "text-sm" : "mb-2"}`}>Upload Resumes</h3>
          {resumes.length === 0 && (
            <>
              <p className="text-sm text-muted-foreground mb-1">
                Drag and drop resumes here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Only PDF format is supported
              </p>
            </>
          )}
        </div>

        {resumes.length === 0 && (
          <>
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-center text-foreground">
                How does it work?
              </h3>
              <ol className="space-y-2 text-sm text-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Enter your job description on the left.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Upload several resumes on the right.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Get a sorted list of applicants in seconds.</span>
                </li>
              </ol>
            </div>

            <div
              className="border-2 border-dashed border-border rounded-lg p-6 space-y-3"
            >
              <div className="text-xs text-muted-foreground leading-relaxed space-y-2">
                <p className="font-medium text-foreground">
                  We are currently seeking a highly motivated and skilled customer
                  service representative to join our team. As a customer service
                  representative, you will be the primary point of contact for our
                  users and will be responsible for providing timely and effective
                  assistance to ensure our users have a seamless experience on our
                  platform.
                </p>
                <p className="font-semibold text-foreground mt-3">
                  Responsibilities include:
                </p>
                <p>
                  Maintaining a high level of customer satisfaction by providing
                  friendly and helpful support to users Troubleshooting and
                  resolving user issues related to the platform and its
                  functionalities
                </p>
              </div>
            </div>
          </>
        )}

        <div className="space-y-2">
          {resumes.map((resume, index) => (
            <div
              key={resume.id}
              className="flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors"
            >
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {resume.name}
                  </p>
                  {resume.filename && (
                    <p className="text-xs text-muted-foreground truncate">
                      {resume.filename}
                    </p>
                  )}
                </div>
              </div>
              <div className="text-success font-semibold text-sm">
                {resume.match}%
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
