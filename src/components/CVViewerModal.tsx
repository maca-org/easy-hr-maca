import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Eye, ExternalLink, Download, Lock, CheckCircle, XCircle, Lightbulb, FileText, Rocket, FileDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Progress } from "@/components/ui/progress";
import jsPDF from "jspdf";

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
  candidateEmail?: string;
  candidatePhone?: string;
  candidateTitle?: string;
}

export function CVViewerModal({
  candidateName,
  cvFilePath,
  cvRate,
  relevanceAnalysis,
  improvementTips,
  isAnalyzed,
  onUpgrade,
  candidateEmail,
  candidatePhone,
  candidateTitle,
}: CVViewerModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

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

  const handleExportAnalysisReport = () => {
    setIsExporting(true);
    
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 20;
      const contentWidth = pageWidth - margin * 2;
      let yPos = 20;

      // Helper function to add text with word wrap
      const addWrappedText = (text: string, x: number, y: number, maxWidth: number, lineHeight: number = 6): number => {
        const lines = doc.splitTextToSize(text, maxWidth);
        doc.text(lines, x, y);
        return y + lines.length * lineHeight;
      };

      // Helper to check if we need a new page
      const checkNewPage = (neededSpace: number) => {
        if (yPos + neededSpace > 280) {
          doc.addPage();
          yPos = 20;
        }
      };

      // Title
      doc.setFontSize(20);
      doc.setFont("helvetica", "bold");
      doc.text("CV Analysis Report", margin, yPos);
      yPos += 15;

      // Candidate Info Section
      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Candidate Information", margin, yPos);
      yPos += 8;

      doc.setFontSize(11);
      doc.setFont("helvetica", "normal");
      doc.text(`Name: ${candidateName}`, margin, yPos);
      yPos += 6;

      if (candidateTitle) {
        doc.text(`Title: ${candidateTitle}`, margin, yPos);
        yPos += 6;
      }

      if (candidateEmail) {
        doc.text(`Email: ${candidateEmail}`, margin, yPos);
        yPos += 6;
      }

      if (candidatePhone) {
        doc.text(`Phone: ${candidatePhone}`, margin, yPos);
        yPos += 6;
      }

      yPos += 5;

      // Overall Score Section
      doc.setDrawColor(200, 200, 200);
      doc.line(margin, yPos, pageWidth - margin, yPos);
      yPos += 10;

      doc.setFontSize(14);
      doc.setFont("helvetica", "bold");
      doc.text("Overall Match Score", margin, yPos);
      
      // Score badge
      const score = overallScore;
      const scoreColor = score >= 80 ? [34, 197, 94] : score >= 60 ? [234, 179, 8] : [239, 68, 68];
      doc.setFillColor(scoreColor[0], scoreColor[1], scoreColor[2]);
      doc.roundedRect(pageWidth - margin - 30, yPos - 6, 30, 10, 2, 2, 'F');
      doc.setTextColor(255, 255, 255);
      doc.setFontSize(11);
      doc.text(`${score}%`, pageWidth - margin - 15, yPos, { align: 'center' });
      doc.setTextColor(0, 0, 0);
      
      yPos += 15;

      // Summary Section
      if (summary) {
        checkNewPage(40);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.text("Summary", margin, yPos);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        yPos = addWrappedText(summary, margin, yPos, contentWidth, 5);
        yPos += 10;
      }

      // Matching Skills Section
      if (matchingSkills.length > 0) {
        checkNewPage(30 + matchingSkills.length * 6);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(34, 197, 94);
        doc.text(`Matching Skills (${matchingSkills.length})`, margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        matchingSkills.forEach((skill) => {
          checkNewPage(6);
          doc.text(`• ${skill}`, margin + 5, yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      // Missing Skills Section
      if (missingSkills.length > 0) {
        checkNewPage(30 + missingSkills.length * 6);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(239, 68, 68);
        doc.text(`Missing Skills (${missingSkills.length})`, margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        missingSkills.forEach((skill) => {
          checkNewPage(6);
          doc.text(`• ${skill}`, margin + 5, yPos);
          yPos += 6;
        });
        yPos += 5;
      }

      // Improvement Tips Section
      if (parsedTips.length > 0) {
        checkNewPage(30 + parsedTips.length * 12);
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(217, 119, 6);
        doc.text("Improvement Tips", margin, yPos);
        doc.setTextColor(0, 0, 0);
        yPos += 7;

        doc.setFontSize(10);
        doc.setFont("helvetica", "normal");
        parsedTips.forEach((tip, idx) => {
          checkNewPage(15);
          yPos = addWrappedText(`${idx + 1}. ${tip}`, margin + 5, yPos, contentWidth - 10, 5);
          yPos += 3;
        });
      }

      // Footer
      const totalPages = doc.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        doc.text(
          `Generated on ${new Date().toLocaleDateString()} | Page ${i} of ${totalPages}`,
          pageWidth / 2,
          290,
          { align: 'center' }
        );
      }

      // Save the PDF
      const fileName = `${candidateName.replace(/\s+/g, '_')}_Analysis_Report.pdf`;
      doc.save(fileName);
      
      toast.success("Analysis report exported successfully!");
    } catch (error) {
      console.error("Error exporting PDF:", error);
      toast.error("Failed to export analysis report");
    } finally {
      setIsExporting(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
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
              <div className="flex flex-wrap gap-3">
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
                <Button 
                  variant="secondary" 
                  onClick={handleExportAnalysisReport}
                  disabled={isExporting}
                  className="gap-2"
                >
                  <FileDown className="h-4 w-4" />
                  {isExporting ? "Exporting..." : "Export Analysis (PDF)"}
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
