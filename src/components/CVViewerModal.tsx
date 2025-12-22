import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, ExternalLink, Download, Lock, CheckCircle, XCircle, Lightbulb, FileText, Rocket } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";

interface RelevanceAnalysis {
  overall_score?: number;
  matching_skills?: string[];
  missing_skills?: string[];
  summary?: string;
  experience_match?: string;
}

interface ImprovementTip {
  tip?: string;
  category?: string;
}

interface CVViewerModalProps {
  candidateName: string;
  cvFilePath: string | null;
  cvRate: number;
  relevanceAnalysis?: RelevanceAnalysis | null;
  improvementTips?: ImprovementTip[] | string[] | null;
  isAnalyzed: boolean;
  onUpgrade?: () => void;
}

export function CVViewerModal({
  candidateName,
  cvFilePath,
  cvRate,
  relevanceAnalysis,
  improvementTips,
  isAnalyzed,
  onUpgrade,
}: CVViewerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleOpenPDF = async () => {
    if (!cvFilePath) {
      toast.error("CV file not available");
      return;
    }

    setIsLoading(true);
    try {
      const { data, error } = await supabase.storage
        .from('cvs')
        .createSignedUrl(cvFilePath, 3600); // 1 hour valid URL

      if (error) throw error;

      window.open(data.signedUrl, '_blank');
    } catch (error) {
      console.error("Error opening CV:", error);
      toast.error("Failed to open CV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadCV = async () => {
    if (!cvFilePath) {
      toast.error("CV file not available");
      return;
    }

    try {
      const { data, error } = await supabase.storage
        .from('cvs')
        .download(cvFilePath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = cvFilePath.split('/').pop() || 'cv.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast.success("CV downloaded successfully");
    } catch (error) {
      console.error("Error downloading CV:", error);
      toast.error("Failed to download CV");
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreBackground = (score: number) => {
    if (score >= 80) return "bg-green-600";
    if (score >= 60) return "bg-yellow-600";
    return "bg-red-600";
  };

  // Parse improvement tips - handle both array of strings and array of objects
  const parsedTips: string[] = improvementTips
    ? (improvementTips as any[]).map((tip) => 
        typeof tip === 'string' ? tip : tip?.tip || ''
      ).filter(Boolean)
    : [];

  // Get matching and missing skills
  const matchingSkills = relevanceAnalysis?.matching_skills || [];
  const missingSkills = relevanceAnalysis?.missing_skills || [];
  const summary = relevanceAnalysis?.summary || '';
  const overallScore = relevanceAnalysis?.overall_score || cvRate;

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="ghost" 
          size="icon" 
          className="h-8 w-8"
          disabled={!cvFilePath}
        >
          <Eye className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-2xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            CV - {candidateName}
          </DialogTitle>
        </DialogHeader>

        {isAnalyzed ? (
          <ScrollArea className="max-h-[70vh] pr-4">
            <div className="space-y-6">
              {/* Action Buttons */}
              <div className="flex gap-3">
                <Button 
                  onClick={handleOpenPDF} 
                  disabled={isLoading || !cvFilePath}
                  className="gap-2"
                >
                  <ExternalLink className="h-4 w-4" />
                  Open PDF in New Tab
                </Button>
                <Button 
                  variant="outline" 
                  onClick={handleDownloadCV}
                  disabled={!cvFilePath}
                  className="gap-2"
                >
                  <Download className="h-4 w-4" />
                  Download CV
                </Button>
              </div>

              <Separator />

              {/* Analysis Report */}
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold">📊 Analysis Report</h3>
                  <Badge 
                    variant="outline" 
                    className={`text-lg px-3 py-1 ${getScoreColor(overallScore)}`}
                  >
                    Score: {overallScore}%
                  </Badge>
                </div>

                {/* Score Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Overall Match</span>
                    <span className={`font-semibold ${getScoreColor(overallScore)}`}>
                      {overallScore}%
                    </span>
                  </div>
                  <Progress 
                    value={overallScore} 
                    className="h-2"
                  />
                </div>

                {/* Summary */}
                {summary && (
                  <div className="bg-muted/50 rounded-lg p-4">
                    <h4 className="font-medium mb-2 flex items-center gap-2">
                      📝 Summary
                    </h4>
                    <p className="text-sm text-muted-foreground">{summary}</p>
                  </div>
                )}

                {/* Matching Skills */}
                {matchingSkills.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-green-600">
                      <CheckCircle className="h-4 w-4" />
                      Matching Skills ({matchingSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {matchingSkills.map((skill, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="bg-green-50 text-green-700 border-green-200 dark:bg-green-950/30 dark:text-green-400 dark:border-green-800"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Missing Skills */}
                {missingSkills.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-red-600">
                      <XCircle className="h-4 w-4" />
                      Missing Skills ({missingSkills.length})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {missingSkills.map((skill, idx) => (
                        <Badge 
                          key={idx} 
                          variant="outline" 
                          className="bg-red-50 text-red-700 border-red-200 dark:bg-red-950/30 dark:text-red-400 dark:border-red-800"
                        >
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* Improvement Tips */}
                {parsedTips.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="font-medium flex items-center gap-2 text-amber-600">
                      <Lightbulb className="h-4 w-4" />
                      Improvement Tips
                    </h4>
                    <ul className="space-y-2">
                      {parsedTips.map((tip, idx) => (
                        <li 
                          key={idx} 
                          className="text-sm text-muted-foreground bg-amber-50 dark:bg-amber-950/30 p-3 rounded-lg border border-amber-200 dark:border-amber-800"
                        >
                          💡 {tip}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
        ) : (
          /* Upgrade Screen for Non-Analyzed CVs */
          <div className="py-8 text-center space-y-6">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted flex items-center justify-center">
              <Lock className="h-8 w-8 text-muted-foreground" />
            </div>
            
            <div className="space-y-2">
              <h3 className="text-xl font-semibold">Analysis Not Available</h3>
              <p className="text-muted-foreground max-w-md mx-auto">
                This CV has not been analyzed due to credit limits. 
                Upgrade to a paid plan to analyze all your CVs and get detailed insights.
              </p>
            </div>

            <Button 
              size="lg" 
              onClick={() => {
                setIsOpen(false);
                onUpgrade?.();
              }}
              className="gap-2"
            >
              <Rocket className="h-4 w-4" />
              Upgrade Plan
            </Button>

            <div className="text-sm text-muted-foreground space-y-1">
              <p className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                100+ CV analyses per month
              </p>
              <p className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                AI-powered skill matching
              </p>
              <p className="flex items-center justify-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                Detailed improvement tips
              </p>
            </div>

            {/* Still allow viewing PDF even if not analyzed */}
            {cvFilePath && (
              <>
                <Separator className="my-6" />
                <div className="flex justify-center gap-3">
                  <Button 
                    variant="outline"
                    onClick={handleOpenPDF} 
                    disabled={isLoading}
                    className="gap-2"
                  >
                    <ExternalLink className="h-4 w-4" />
                    View CV (PDF Only)
                  </Button>
                  <Button 
                    variant="ghost" 
                    onClick={handleDownloadCV}
                    className="gap-2"
                  >
                    <Download className="h-4 w-4" />
                    Download
                  </Button>
                </div>
              </>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
