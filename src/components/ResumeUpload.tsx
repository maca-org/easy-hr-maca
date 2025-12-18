import { Upload, FileText, Trash2 } from "lucide-react";
import { useState } from "react";
import { Resume } from "@/pages/Index";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
interface ResumeUploadProps {
  resumes: Resume[];
  onUploadResumes: (files: File[]) => void;
  onDeleteResume?: (id: string) => void;
}
export const ResumeUpload = ({
  resumes,
  onUploadResumes,
  onDeleteResume
}: ResumeUploadProps) => {
  const [isDragging, setIsDragging] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingResumeId, setDeletingResumeId] = useState<string | null>(null);
  const handleFiles = (files: FileList | null) => {
    if (!files) return;
    const fileArray = Array.from(files).filter(file => file.type === "application/pdf");
    if (fileArray.length > 0) {
      onUploadResumes(fileArray);
    }
  };
  const handleDeleteClick = (id: string) => {
    setDeletingResumeId(id);
    setDeleteDialogOpen(true);
  };
  const confirmDelete = () => {
    if (deletingResumeId && onDeleteResume) {
      onDeleteResume(deletingResumeId);
    }
    setDeleteDialogOpen(false);
    setDeletingResumeId(null);
  };
  return <div className="w-96 bg-background border-l border-border flex flex-col">
      <div className="p-6 space-y-6 flex-1 overflow-y-auto flex flex-col items-center">
        <div className={`border-2 border-dashed rounded-lg text-center transition-all cursor-pointer ${resumes.length > 0 ? "p-4" : "p-8"} ${isDragging ? "border-primary bg-primary/5" : "border-border bg-muted/30"}`} onDragOver={e => {
        e.preventDefault();
        setIsDragging(true);
      }} onDragLeave={() => setIsDragging(false)} onDrop={e => {
        e.preventDefault();
        setIsDragging(false);
        handleFiles(e.dataTransfer.files);
      }} onClick={() => document.getElementById("file-upload")?.click()}>
          <input id="file-upload" type="file" multiple accept=".pdf" className="hidden" onChange={e => handleFiles(e.target.files)} />
          <Upload className={`text-primary mx-auto ${resumes.length > 0 ? "w-8 h-8 mb-2" : "w-12 h-12 mb-4"}`} />
          <h3 className={`font-semibold text-foreground ${resumes.length > 0 ? "text-sm" : "mb-2"}`}>Upload Resumes</h3>
          {resumes.length === 0 && <>
              <p className="text-sm text-muted-foreground mb-1">
                Drag and drop resumes here or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Only PDF format is supported
              </p>
            </>}
        </div>

        {resumes.length === 0 && <>
            <div className="space-y-4">
              <h3 className="font-bold text-xl text-center text-foreground">
                How does it work?
              </h3>
              <ol className="space-y-2 text-sm text-foreground">
                <li className="flex gap-2">
                  <span className="font-semibold">1.</span>
                  <span>Save the job description.</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">2.</span>
                  <span>Use the application link or Upload resumes</span>
                </li>
                <li className="flex gap-2">
                  <span className="font-semibold">3.</span>
                  <span>Get top candidates instantly.</span>
                </li>
              </ol>
            </div>

            
          </>}

        <div className="space-y-2">
          {[...resumes].sort((a, b) => b.match - a.match).map((resume, index) => <div key={resume.id} className="group flex items-center justify-between p-3 bg-muted/50 rounded-lg hover:bg-muted transition-colors">
              <div className="flex items-center gap-3 flex-1 min-w-0">
                <span className="text-sm font-medium text-muted-foreground">
                  {index + 1}.
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {resume.name}
                  </p>
                  {resume.filename && <p className="text-xs text-muted-foreground truncate">
                      {resume.filename}
                    </p>}
                </div>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-success font-semibold text-sm">
                  {resume.match}%
                </div>
                {onDeleteResume && <Button variant="ghost" size="icon" className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity hover:bg-destructive/10 hover:text-destructive" onClick={() => handleDeleteClick(resume.id)}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>}
              </div>
            </div>)}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Resume</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this resume? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>;
};