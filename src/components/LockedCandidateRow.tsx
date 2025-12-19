import { Lock, Unlock, Mail, Phone, ChevronDown, Trash2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { ViewAnswersModal } from "@/components/ViewAnswersModal";

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
}

interface LockedCandidateRowProps {
  candidate: Candidate;
  overallScore: number;
  isExpanded: boolean;
  isSelected: boolean;
  isUnlocking: boolean;
  onSelect: (id: string) => void;
  onExpand: (id: string | null) => void;
  onDelete: (id: string) => void;
  onUnlock: (id: string) => void;
  canUnlock: boolean;
  planType: string;
}

export function LockedCandidateRow({
  candidate,
  overallScore,
  isExpanded,
  isSelected,
  isUnlocking,
  onSelect,
  onExpand,
  onDelete,
  onUnlock,
  canUnlock,
  planType
}: LockedCandidateRowProps) {
  const isLocked = !candidate.is_unlocked;
  const isFreeUser = planType === 'free';
  const scoreColor = overallScore >= 80 ? "text-green-600" : overallScore >= 60 ? "text-yellow-600" : "text-red-600";

  // Masked display for locked candidates
  const displayName = isLocked ? `Candidate #${candidate.id.slice(0, 4).toUpperCase()}` : candidate.name;
  const displayTitle = isLocked ? "••••••••" : candidate.title;
  const displayEmail = isLocked ? "••••@••••.com" : candidate.email;

  return (
    <div className="border rounded-lg overflow-hidden">
      <div className="grid grid-cols-[40px_80px_200px_100px_100px_100px_100px_80px_80px] gap-4 px-4 py-4 hover:bg-muted/30 transition-colors items-center">
        {/* Checkbox */}
        <div className="flex items-center justify-center">
          <Checkbox 
            checked={isSelected}
            onCheckedChange={() => onSelect(candidate.id)}
          />
        </div>

        {/* Overall Score - Always visible but blurred for locked */}
        <div className={`text-2xl font-bold ${isLocked ? 'blur-sm select-none' : scoreColor}`}>
          {overallScore}%
        </div>

        {/* Name & Title */}
        <div className="flex items-center gap-2">
          {isLocked && (
            <Lock className="h-4 w-4 text-muted-foreground shrink-0" />
          )}
          <div className={isLocked ? 'opacity-60' : ''}>
            <p className="font-medium text-foreground">{displayName}</p>
            {displayTitle && <p className="text-sm text-muted-foreground">{displayTitle}</p>}
          </div>
        </div>

        {/* CV Rate */}
        <div className="text-center">
          {candidate.analyzing ? (
            <span className="text-xs text-purple-500 flex items-center justify-center gap-1">
              <Loader2 className="h-3 w-3 animate-spin" />
              Analyzing...
            </span>
          ) : candidate.cv_rate === 0 && !candidate.relevance_analysis ? (
            <span className="text-xs text-muted-foreground">Queued</span>
          ) : isLocked ? (
            <span className="blur-sm select-none font-semibold">{candidate.cv_rate}%</span>
          ) : (
            <span className={`font-semibold ${candidate.cv_rate >= 80 ? "text-green-600" : "text-red-600"}`}>
              {candidate.cv_rate}%
            </span>
          )}
        </div>

        {/* Test Result */}
        <div className="text-center">
          {candidate.test_result !== null ? (
            isLocked ? (
              <span className="blur-sm select-none font-semibold">{candidate.test_result}%</span>
            ) : (
              <span className={`font-semibold ${candidate.test_result >= 80 ? "text-green-600" : "text-red-600"}`}>
                {candidate.test_result}%
              </span>
            )
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>

        {/* AI Interview */}
        <div className="text-center">
          {candidate.ai_interview_score !== null ? (
            isLocked ? (
              <span className="blur-sm select-none font-semibold">{candidate.ai_interview_score}%</span>
            ) : (
              <span className="font-semibold">{candidate.ai_interview_score}%</span>
            )
          ) : (
            <span className="text-muted-foreground text-sm">Coming Soon</span>
          )}
        </div>

        {/* View Answers */}
        <div className="flex items-center justify-center">
          {candidate.completed_test && candidate.assessment_answers && !isLocked ? (
            <ViewAnswersModal
              candidateName={candidate.name}
              testResult={candidate.test_result}
              assessmentAnswers={Array.isArray(candidate.assessment_answers) ? candidate.assessment_answers : null}
              detailedScores={Array.isArray(candidate.test_detailed_scores) ? candidate.test_detailed_scores : null}
            />
          ) : isLocked ? (
            <Button
              variant="outline"
              size="sm"
              onClick={() => onUnlock(candidate.id)}
              disabled={isUnlocking || (isFreeUser && !canUnlock)}
              className="gap-1"
            >
              {isUnlocking ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Unlock className="h-3 w-3" />
              )}
              Unlock
            </Button>
          ) : (
            <span className="text-muted-foreground text-sm">-</span>
          )}
        </div>

        {/* Contact Actions */}
        <div className="flex items-center justify-center gap-2">
          {isLocked ? (
            <Lock className="h-4 w-4 text-muted-foreground" />
          ) : (
            <>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-8 w-8" 
                onClick={() => window.open(`mailto:${candidate.email}`, "_blank")}
              >
                <Mail className="h-4 w-4" />
              </Button>
              {candidate.phone && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <Phone className="h-4 w-4" />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>{candidate.phone}</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </>
          )}
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
            disabled={isLocked}
          >
            <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
          </Button>
        </div>
      </div>

      {/* Expanded Insights Section - Only show if unlocked */}
      {isExpanded && !isLocked && (
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
