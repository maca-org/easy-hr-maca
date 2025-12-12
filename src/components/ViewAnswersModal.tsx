import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, CheckCircle, XCircle } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";

interface Answer {
  question_id: string;
  question_text?: string;
  answer: string;
  time_spent?: number;
}

interface DetailedScore {
  question_id: string;
  score: number;
  is_correct?: boolean;
  feedback?: string;
}

interface Question {
  id: string;
  text: string;
  type: 'mcq' | 'open';
  options?: string[];
  correctAnswer?: string;
}

interface ViewAnswersModalProps {
  candidateName: string;
  testResult: number | null;
  assessmentAnswers: Answer[] | null;
  detailedScores: DetailedScore[] | null;
  questions?: Question[];
}

export function ViewAnswersModal({
  candidateName,
  testResult,
  assessmentAnswers,
  detailedScores,
  questions = [],
}: ViewAnswersModalProps) {
  if (!assessmentAnswers || assessmentAnswers.length === 0) {
    return null;
  }

  const getScoreForQuestion = (questionId: string): DetailedScore | undefined => {
    return detailedScores?.find((s) => s.question_id === questionId);
  };

  const getQuestionText = (answer: Answer): string => {
    // First check if question text is in the answer itself
    if (answer.question_text) return answer.question_text;
    
    // Otherwise try to find it in the questions array
    const question = questions.find((q) => q.id === answer.question_id);
    return question?.text || `Question ${answer.question_id}`;
  };

  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="gap-1">
          <Eye className="h-4 w-4" />
          View Answers
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-3xl max-h-[85vh]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>{candidateName}'s Assessment Answers</span>
            {testResult !== null && (
              <Badge 
                variant={testResult >= 80 ? "default" : testResult >= 60 ? "secondary" : "destructive"}
                className="text-lg px-3 py-1"
              >
                Score: {testResult}%
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>
        
        <ScrollArea className="max-h-[65vh] pr-4">
          <div className="space-y-4">
            {assessmentAnswers.map((answer, index) => {
              const score = getScoreForQuestion(answer.question_id);
              const isCorrect = score?.is_correct;
              const hasScoreData = score !== undefined;
              
              return (
                <div 
                  key={answer.question_id || index} 
                  className="border rounded-lg p-4 space-y-3"
                >
                  {/* Question Header */}
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <p className="font-medium text-foreground">
                        Q{index + 1}: {getQuestionText(answer)}
                      </p>
                    </div>
                    {hasScoreData && (
                      <div className="flex items-center gap-2 shrink-0">
                        {isCorrect !== undefined && (
                          isCorrect ? (
                            <Badge variant="default" className="bg-green-600 hover:bg-green-700 gap-1">
                              <CheckCircle className="h-3 w-3" />
                              Correct
                            </Badge>
                          ) : (
                            <Badge variant="destructive" className="gap-1">
                              <XCircle className="h-3 w-3" />
                              Incorrect
                            </Badge>
                          )
                        )}
                        {score?.score !== undefined && (
                          <Badge variant="outline">
                            {score.score} pts
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Candidate's Answer */}
                  <div className="bg-muted/50 rounded-md p-3">
                    <p className="text-sm text-muted-foreground mb-1">Answer:</p>
                    <p className="text-foreground">{answer.answer || "No answer provided"}</p>
                  </div>

                  {/* Feedback */}
                  {score?.feedback && (
                    <div className="bg-blue-50 dark:bg-blue-950/30 rounded-md p-3 border border-blue-200 dark:border-blue-800">
                      <p className="text-sm text-blue-600 dark:text-blue-400 mb-1">Feedback:</p>
                      <p className="text-foreground text-sm">{score.feedback}</p>
                    </div>
                  )}

                  {/* Time Spent */}
                  {answer.time_spent && (
                    <p className="text-xs text-muted-foreground">
                      Time spent: {Math.round(answer.time_spent / 1000)}s
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}
