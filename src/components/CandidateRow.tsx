import { Mail, Phone, ChevronDown, Trash2, Loader2, AlertCircle, Check, Copy, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewAnswersModal } from "@/components/ViewAnswersModal";
import { CVViewerModal } from "@/components/CVViewerModal";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { toast } from "sonner";

interface Candidate {
  id: string;
  name: string;
  title: string | null;
  email: string;
  phone: string | null;
  cv_rate: number;
  test_result: number | null;
  ai_interview_score: number | null;
  completed_test: boolean;
  created_at: string;
  insights: {
    matching: string[];
    not_matching: string[];
  };
  extracted_data?: any;
  relevance_analysis?: any;
  improvement_tips?: any;
  analyzing?: boolean;
  assessment_answers?: any;
  test_detailed_scores?: any;
  is_unlocked?: boolean;
  cv_file_path?: string | null;
  is_favorite?: boolean;
}

interface CandidateRowProps {
  candidate: Candidate;
  overallScore: number;
  isExpanded: boolean;
  isSelected: boolean;
  isFavorite: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUpgrade?: () => void;
  onToggleFavorite: (id: string, newValue: boolean) => void;
}

export function CandidateRow({
  candidate,
  overallScore,
  isExpanded,
  isSelected,
  isFavorite,
  onSelect,
  onExpand,
  onDelete,
  onUpgrade,
  onToggleFavorite
}: CandidateRowProps) {
  const [copiedEmail, setCopiedEmail] = useState(false);
  const [copiedPhone, setCopiedPhone] = useState(false);
  
  const scoreColor = overallScore >= 80 ? "text-green-600" : overallScore >= 60 ? "text-yellow-600" : "text-red-600";
  const isAnalyzed = candidate.cv_rate > 0 || candidate.relevance_analysis;
  const isPendingAnalysis = !isAnalyzed && !candidate.analyzing;

  const copyToClipboard = async (text: string, type: 'email' | 'phone') => {
    try {
      await navigator.clipboard.writeText(text);
      if (type === 'email') {
        setCopiedEmail(true);
        setTimeout(() => setCopiedEmail(false), 2000);
      } else {
        setCopiedPhone(true);
        setTimeout(() => setCopiedPhone(false), 2000);
      }
      toast.success(`${type === 'email' ? 'Email' : 'Phone'} copied!`);
    } catch (err) {
      toast.error('Failed to copy');
    }
  };
  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[40px_80px_200px_100px_100px_100px_100px_80px_80px_50px] gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center">
        {/* Checkbox */}
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onSelect(candidate.id)}
          />
        </div>

        {/* Overall Score */}
        <div className={`text-2xl font-bold ${isAnalyzed ? scoreColor : 'text-muted-foreground'}`}>
          {isAnalyzed ? `${overallScore}%` : '-'}
        </div>

        {/* Name & Title */}
        <div className="flex items-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 shrink-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleFavorite(candidate.id, !isFavorite);
                  }}
                >
                  <Star 
                    className={`h-4 w-4 transition-all ${
                      isFavorite 
                        ? 'fill-yellow-400 text-yellow-400' 
                        : 'text-muted-foreground hover:text-yellow-400'
                    }`} 
                  />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{isFavorite ? 'Remove from favorites' : 'Mark as favorite'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <div>
            <p className="font-medium text-foreground">{candidate.name}</p>
            {candidate.title && <p className="text-sm text-muted-foreground">{candidate.title}</p>}
          </div>
        </div>

        {/* CV Rate */}
        <div className="text-center">
          {candidate.analyzing ? (
            <span className="text-xs text-purple-500 flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </span>
          ) : isPendingAnalysis ? (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger>
                  <Badge variant="outline" className="text-xs gap-1">
                    <AlertCircle className="h-3 w-3" />
                    Pending
                  </Badge>
                </TooltipTrigger>
                <TooltipContent>
                  <p>Upgrade to analyze this CV</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          ) : (
            <span className={`font-semibold ${candidate.cv_rate >= 80 ? "text-green-600" : "text-red-600"}`}>
              {candidate.cv_rate}%
            </span>
          )}
        </div>

        {/* Test Result */}
        <div className="text-center">
          {candidate.test_result !== null ? (
            <span className={`font-semibold ${candidate.test_result >= 80 ? "text-green-600" : "text-red-600"}`}>
              {candidate.test_result}%
            </span>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>

        {/* AI Interview */}
        <div className="text-center">
          {candidate.ai_interview_score !== null ? (
            <span className="font-semibold">{candidate.ai_interview_score}%</span>
          ) : (
            <span className="text-muted-foreground text-sm">Coming Soon</span>
          )}
        </div>

        {/* View Answers */}
        <div className="flex items-center justify-center">
          {candidate.completed_test && candidate.assessment_answers ? (
            <ViewAnswersModal
              candidateName={candidate.name}
              testResult={candidate.test_result}
              assessmentAnswers={Array.isArray(candidate.assessment_answers) ? candidate.assessment_answers : null}
              detailedScores={Array.isArray(candidate.test_detailed_scores) ? candidate.test_detailed_scores : null}
            />
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>

        {/* Contact Actions */}
        <div className="flex items-center justify-center gap-2">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-8 w-8" 
                  onClick={() => copyToClipboard(candidate.email, 'email')}
                >
                  {copiedEmail ? (
                    <Check className="h-4 w-4 text-green-500" />
                  ) : (
                    <Mail className="h-4 w-4" />
                  )}
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>{copiedEmail ? 'Copied!' : 'Click to copy email'}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          {candidate.phone && (
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8"
                    onClick={() => copyToClipboard(candidate.phone!, 'phone')}
                  >
                    {copiedPhone ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Phone className="h-4 w-4" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{copiedPhone ? 'Copied!' : 'Click to copy phone'}</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          )}
        </div>

        {/* CV Viewer */}
        <div className="flex items-center justify-center">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <div>
                  <CVViewerModal
                    candidateName={candidate.name}
                    cvFilePath={candidate.cv_file_path || null}
                    cvRate={candidate.cv_rate}
                    relevanceAnalysis={candidate.relevance_analysis}
                    improvementTips={candidate.improvement_tips}
                    isAnalyzed={isAnalyzed}
                    onUpgrade={onUpgrade}
                    candidateEmail={candidate.email}
                    candidatePhone={candidate.phone || undefined}
                    candidateTitle={candidate.title || undefined}
                  />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p>{candidate.cv_file_path ? "View CV & Analysis" : "CV not available"}</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-center gap-2">
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8 hover:bg-destructive/10 hover:text-destructive" 
            onClick={() => onDelete(candidate.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
          <Button 
            variant="ghost" 
            size="icon" 
            className="h-8 w-8" 
            onClick={() => onExpand(isExpanded ? null : candidate.id)}
            disabled={!isAnalyzed}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Expanded Insights Section */}
      {isExpanded && isAnalyzed && (
        <div className="px-4 py-4 bg-muted/20 border-t">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-sm text-green-600 mb-2">
                ✓ Matches Job Description
              </h4>
              {candidate.insights.matching.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {candidate.insights.matching.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
            <div>
              <h4 className="font-semibold text-sm text-red-600 mb-2">
                ✗ Does Not Match Job Description
              </h4>
              {candidate.insights.not_matching.length > 0 ? (
                <ul className="space-y-1 text-sm text-muted-foreground">
                  {candidate.insights.not_matching.map((item, idx) => (
                    <li key={idx}>• {item}</li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-muted-foreground">-</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
