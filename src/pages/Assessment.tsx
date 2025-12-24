import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { useToast } from "@/hooks/use-toast";
import { Loader2, CheckCircle2 } from "lucide-react";

interface Question {
  id: string;
  question: string;
  type: "multiple_choice" | "text" | "mcq" | "open";
  options?: string[];
  correct_answer?: string;
  skill?: string;
  difficulty?: string;
}

interface Answer {
  question_id: string;
  question_text: string;
  question_type: string;
  answer: string;
  time_spent_seconds: number;
}

const Assessment = () => {
  const { candidateId } = useParams<{ candidateId: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [candidate, setCandidate] = useState<any>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [startTime, setStartTime] = useState<number>(Date.now());
  const [questionStartTimes, setQuestionStartTimes] = useState<Record<string, number>>({});
  const [completed, setCompleted] = useState(false);

  useEffect(() => {
    fetchAssessmentData();
  }, [candidateId]);

  const fetchAssessmentData = async () => {
    if (!candidateId) {
      toast({
        title: "Error",
        description: "Invalid assessment link",
        variant: "destructive",
      });
      return;
    }

    try {
      // Use edge function to fetch assessment data (bypasses RLS)
      const { data, error } = await supabase.functions.invoke("get-assessment", {
        body: { candidateId },
      });

      if (error) {
        console.error("Edge function error:", error);
        toast({
          title: "Error",
          description: "Failed to load assessment",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Handle error responses from edge function
      if (data.error) {
        toast({
          title: "Error",
          description: data.error,
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Check if already completed
      if (data.completed) {
        setCandidate(data.candidate);
        setCompleted(true);
        setLoading(false);
        return;
      }

      setCandidate(data.candidate);

      const questionsArray = Array.isArray(data.questions) 
        ? (data.questions as Question[])
        : [];
      
      setQuestions(questionsArray);
      
      // Initialize question start times
      const times: Record<string, number> = {};
      questionsArray.forEach((q: Question) => {
        times[q.id] = Date.now();
      });
      setQuestionStartTimes(times);
      
      setLoading(false);
    } catch (error) {
      console.error("Error fetching assessment:", error);
      toast({
        title: "Error",
        description: "Failed to load assessment",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [questionId]: answer }));
  };

  const handleNext = () => {
    if (currentQuestionIndex < questions.length - 1) {
      setCurrentQuestionIndex(prev => prev + 1);
      // Update start time for next question
      setQuestionStartTimes(prev => ({
        ...prev,
        [questions[currentQuestionIndex + 1].id]: Date.now()
      }));
    }
  };

  const handlePrevious = () => {
    if (currentQuestionIndex > 0) {
      setCurrentQuestionIndex(prev => prev - 1);
    }
  };

  const handleSubmit = async () => {
    // Questions are now optional - allow submission with unanswered questions
    setSubmitting(true);

    try {
      // Calculate time spent on each question and include question text
      const answersWithTime: Answer[] = questions.map(q => ({
        question_id: q.id,
        question_text: q.question,
        question_type: q.type,
        answer: answers[q.id] || "",
        time_spent_seconds: Math.floor((Date.now() - questionStartTimes[q.id]) / 1000)
      }));

      // Call edge function to submit assessment
      const { data, error } = await supabase.functions.invoke("submit-assessment", {
        body: {
          candidateId,
          answers: answersWithTime,
        },
      });

      if (error) throw error;

      toast({
        title: "Assessment Submitted",
        description: "Thank you for completing the assessment!",
      });

      setCompleted(true);
    } catch (error) {
      console.error("Error submitting assessment:", error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit assessment. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <p className="text-muted-foreground">Loading assessment...</p>
        </div>
      </div>
    );
  }

  if (completed) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <CheckCircle2 className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <CardTitle className="text-2xl">Assessment Complete</CardTitle>
          </CardHeader>
          <CardContent className="text-center space-y-4">
            <p className="text-muted-foreground">
              Thank you for completing the assessment. Your responses have been submitted successfully.
            </p>
            <p className="text-sm text-muted-foreground">
              The hiring team will review your answers and get back to you soon.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!candidate || questions.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="max-w-md w-full">
          <CardHeader>
            <CardTitle>Assessment Not Available</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground">
              This assessment is not available or has expired.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const currentQuestion = questions[currentQuestionIndex];
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100;
  const isLastQuestion = currentQuestionIndex === questions.length - 1;
  const answeredCount = questions.filter(q => answers[q.id]).length;

  return (
    <div className="min-h-screen bg-background p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Header */}
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">Assessment</h1>
          <p className="text-muted-foreground">
            Candidate: <span className="font-medium text-foreground">{candidate.name}</span>
          </p>
          {candidate.assessment_due_date && (
            <p className="text-sm text-muted-foreground">
              Due: {new Date(candidate.assessment_due_date).toLocaleDateString()}
            </p>
          )}
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm text-muted-foreground">
            <span>Question {currentQuestionIndex + 1} of {questions.length}</span>
            <span>{Math.round(progress)}% Complete</span>
          </div>
          <Progress value={progress} />
        </div>

        {/* Question Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-xl">
              Question {currentQuestionIndex + 1}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <p className="text-lg">{currentQuestion.question}</p>

            {(currentQuestion.type === "multiple_choice" || currentQuestion.type === "mcq") && currentQuestion.options && (
              <RadioGroup
                value={answers[currentQuestion.id] || ""}
                onValueChange={(value) => handleAnswerChange(currentQuestion.id, value)}
              >
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label htmlFor={`option-${index}`} className="cursor-pointer flex-1">
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {(currentQuestion.type === "text" || currentQuestion.type === "open") && (
              <Textarea
                placeholder="Type your answer here..."
                value={answers[currentQuestion.id] || ""}
                onChange={(e) => handleAnswerChange(currentQuestion.id, e.target.value)}
                rows={6}
                className="resize-none"
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between items-center">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentQuestionIndex === 0}
          >
            Previous
          </Button>

          <div className="text-sm text-muted-foreground">
            {answeredCount === questions.length ? (
              <span className="text-green-600 font-medium">All questions answered ✓</span>
            ) : (
              <span>{answeredCount} of {questions.length} answered (skipping allowed)</span>
            )}
          </div>

          <div className="flex gap-2">
            {!isLastQuestion ? (
              <>
                <Button variant="ghost" onClick={handleNext} className="text-muted-foreground">
                  Skip
                </Button>
                <Button onClick={handleNext}>
                  Next
                </Button>
              </>
            ) : (
              <Button 
                onClick={handleSubmit} 
                disabled={submitting}
              >
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitting ? "Submitting..." : "Submit Assessment"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Assessment;