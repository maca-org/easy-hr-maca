import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Edit2, Trash2, Plus, X, CheckCircle2, Award, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import type { Question } from "./Index";
import type { User } from "@supabase/supabase-js";

export const QuestionsReview = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("id");
  
  const [user, setUser] = useState<User | null>(null);
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [isPolling, setIsPolling] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"mcq" | "open">("mcq");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", "", ""]);
  const [newSkill, setNewSkill] = useState("");
  const [newDifficulty, setNewDifficulty] = useState<"easy" | "medium" | "hard">("medium");
  const [newCorrectAnswer, setNewCorrectAnswer] = useState("");

  // Check authentication
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        navigate("/");
        return;
      }
      setUser(session.user);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (!session) {
        navigate("/");
      } else {
        setUser(session.user);
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  // Fetch questions from Supabase
  useEffect(() => {
    if (!user) return;
    
    const fetchQuestions = async () => {
      if (!jobId) return;

      const { data, error } = await supabase
        .from("job_openings")
        .select("questions")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("Error fetching questions:", error);
        toast.error("Failed to load questions");
        setLoading(false);
        setIsPolling(false);
        return;
      }

      // Check if questions is an empty object or has actual questions
      const hasQuestions = data?.questions && 
        typeof data.questions === 'object' && 
        Array.isArray(data.questions) && 
        data.questions.length > 0;

      if (hasQuestions) {
        setQuestions(data.questions as unknown as Question[]);
        setLoading(false);
        setIsPolling(false);
        toast.success("Questions loaded successfully!");
      } else {
        // No questions yet, check if we should start polling
        if (!isPolling && loading) {
          setIsPolling(true);
          toast.info("Waiting for questions to be generated...");
        }
        setLoading(false);
      }
    };

    fetchQuestions();
  }, [jobId, user]);

  // Polling mechanism
  useEffect(() => {
    if (!isPolling || !jobId) return;

    let pollCount = 0;
    const maxPolls = 60; // Poll for max 2 minutes (60 * 2 seconds)

    const pollInterval = setInterval(async () => {
      pollCount++;

      console.log(`Polling for questions... (${pollCount}/${maxPolls})`);

      const { data, error } = await supabase
        .from("job_openings")
        .select("questions")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("Polling error:", error);
        return;
      }

      const hasQuestions = data?.questions && 
        typeof data.questions === 'object' && 
        Array.isArray(data.questions) && 
        data.questions.length > 0;

      if (hasQuestions) {
        setQuestions(data.questions as unknown as Question[]);
        setIsPolling(false);
        toast.success("Questions generated successfully!");
        clearInterval(pollInterval);
      } else if (pollCount >= maxPolls) {
        setIsPolling(false);
        toast.error("Questions generation timed out. Please refresh manually.");
        clearInterval(pollInterval);
      }
    }, 2000); // Poll every 2 seconds

    return () => clearInterval(pollInterval);
  }, [isPolling, jobId]);

  const handleManualRefresh = async () => {
    if (!jobId || refreshing) return;

    setRefreshing(true);
    try {
      const { data, error } = await supabase
        .from("job_openings")
        .select("questions")
        .eq("id", jobId)
        .single();

      if (error) {
        console.error("Error fetching questions:", error);
        toast.error("Failed to refresh questions");
        return;
      }

      const hasQuestions = data?.questions && 
        typeof data.questions === 'object' && 
        Array.isArray(data.questions) && 
        data.questions.length > 0;

      if (hasQuestions) {
        setQuestions(data.questions as unknown as Question[]);
        setIsPolling(false);
        toast.success("Questions loaded successfully!");
      } else {
        toast.info("No questions found yet. They may still be generating.");
      }
    } finally {
      setRefreshing(false);
    }
  };

  if (!jobId) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Job ID not found</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-muted-foreground">Loading questions...</p>
          </div>
        </div>
      </div>
    );
  }

  if (isPolling && questions.length === 0) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-4 max-w-md">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
            <p className="text-foreground font-medium text-lg">Generating Questions...</p>
            <p className="text-muted-foreground text-sm">
              n8n is processing your job description and generating personalized interview questions. 
              This usually takes 20-60 seconds.
            </p>
            <Button
              onClick={handleManualRefresh}
              disabled={refreshing}
              variant="outline"
              className="mt-4"
            >
              <RefreshCw className={`w-4 h-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
              {refreshing ? "Checking..." : "Check Now"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  const handleEdit = (question: Question) => {
    setEditingId(question.id);
    setEditingQuestion({ ...question });
  };

  const handleSaveEdit = () => {
    if (editingQuestion) {
      const updated = questions.map(q => 
        q.id === editingQuestion.id ? editingQuestion : q
      );
      setQuestions(updated);
      setEditingId(null);
      setEditingQuestion(null);
      toast.success("Question updated");
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingQuestion(null);
  };

  const handleDelete = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
    toast.success("Question deleted");
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `${newQuestionType}-${Date.now()}`,
      type: newQuestionType,
      question: newQuestionText,
      options: newQuestionType === "mcq" ? newOptions.filter(o => o.trim()) : undefined,
      skill: newSkill || undefined,
      difficulty: newQuestionType === "mcq" ? newDifficulty : undefined,
      correct_answer: newQuestionType === "mcq" ? newCorrectAnswer : undefined,
    };
    setQuestions([...questions, newQuestion]);
    setIsAddDialogOpen(false);
    setNewQuestionText("");
    setNewOptions(["", "", "", ""]);
    setNewQuestionType("mcq");
    setNewSkill("");
    setNewDifficulty("medium");
    setNewCorrectAnswer("");
    toast.success("Question added");
  };

  const handleSaveAndContinue = async () => {
    try {
      const { error } = await supabase
        .from("job_openings")
        .update({ questions: questions as any })
        .eq("id", jobId);

      if (error) throw error;

      toast.success("Questions saved successfully!");
      navigate(`/candidate-details?id=${jobId}`);
    } catch (error) {
      console.error("Error saving questions:", error);
      toast.error("Failed to save questions");
    }
  };

  const mcqCount = questions.filter(q => q.type === "mcq").length;
  const openCount = questions.filter(q => q.type === "open").length;
  const easyCount = questions.filter(q => q.difficulty === "easy").length;
  const mediumCount = questions.filter(q => q.difficulty === "medium").length;
  const hardCount = questions.filter(q => q.difficulty === "hard").length;
  const skills = Array.from(new Set(questions.map(q => q.skill).filter(Boolean)));

  const getDifficultyColor = (difficulty?: string) => {
    switch (difficulty) {
      case "easy": return "bg-green-500/10 text-green-700 dark:text-green-400 border-green-500/20";
      case "medium": return "bg-yellow-500/10 text-yellow-700 dark:text-yellow-400 border-yellow-500/20";
      case "hard": return "bg-red-500/10 text-red-700 dark:text-red-400 border-red-500/20";
      default: return "";
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <Header />
      <div className="flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Review & Edit Generated Questions</h1>
          <p className="text-muted-foreground">
            These questions were generated based on your Job Description. You can edit, delete, or add new questions.
          </p>
        </div>

        <div className="flex gap-6 px-8 py-6">
          {/* Left Section - Questions List */}
          <div className="flex-1 pr-4 space-y-4">
            {questions.map((question) => (
              <Card key={question.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex flex-wrap gap-2">
                    <Badge variant={question.type === "mcq" ? "default" : "secondary"}>
                      {question.type === "mcq" ? "MCQ" : "Open-Ended"}
                    </Badge>
                    {question.difficulty && (
                      <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                        {question.difficulty.toUpperCase()}
                      </Badge>
                    )}
                    {question.skill && (
                      <Badge variant="outline" className="flex items-center gap-1">
                        <Award className="w-3 h-3" />
                        {question.skill}
                      </Badge>
                    )}
                  </div>
                  <div className="flex gap-2">
                    {editingId === question.id ? (
                      <>
                        <Button size="sm" onClick={handleSaveEdit}>Save</Button>
                        <Button size="sm" variant="outline" onClick={handleCancelEdit}>Cancel</Button>
                      </>
                    ) : (
                      <>
                        <Button size="sm" variant="ghost" onClick={() => handleEdit(question)}>
                          <Edit2 className="w-4 h-4" />
                        </Button>
                        <Button size="sm" variant="ghost" onClick={() => handleDelete(question.id)}>
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </>
                    )}
                  </div>
                </div>

                {editingId === question.id && editingQuestion ? (
                  <div className="space-y-4">
                    <div>
                      <Label>Question Text</Label>
                      <Textarea
                        value={editingQuestion.question}
                        onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                        className="min-h-[80px] mt-2"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Skill</Label>
                        <Input
                          value={editingQuestion.skill || ""}
                          onChange={(e) => setEditingQuestion({ ...editingQuestion, skill: e.target.value })}
                          placeholder="e.g., Process analysis"
                          className="mt-2"
                        />
                      </div>
                      {editingQuestion.type === "mcq" && (
                        <div>
                          <Label>Difficulty</Label>
                          <Select
                            value={editingQuestion.difficulty || "medium"}
                            onValueChange={(value: "easy" | "medium" | "hard") =>
                              setEditingQuestion({ ...editingQuestion, difficulty: value })
                            }
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="easy">Easy</SelectItem>
                              <SelectItem value="medium">Medium</SelectItem>
                              <SelectItem value="hard">Hard</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>

                    {editingQuestion.type === "mcq" && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {editingQuestion.options?.map((option, idx) => (
                          <div key={idx} className="flex gap-2 items-center">
                            <Input
                              value={option}
                              onChange={(e) => {
                                const newOptions = [...(editingQuestion.options || [])];
                                newOptions[idx] = e.target.value;
                                setEditingQuestion({ ...editingQuestion, options: newOptions });
                              }}
                              placeholder={`Option ${idx + 1}`}
                            />
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                const newOptions = editingQuestion.options?.filter((_, i) => i !== idx);
                                setEditingQuestion({ ...editingQuestion, options: newOptions });
                              }}
                            >
                              <X className="w-4 h-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => {
                            setEditingQuestion({
                              ...editingQuestion,
                              options: [...(editingQuestion.options || []), ""]
                            });
                          }}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>

                        <div className="mt-4">
                          <Label>Correct Answer</Label>
                          <Select
                            value={editingQuestion.correct_answer || ""}
                            onValueChange={(value) =>
                              setEditingQuestion({ ...editingQuestion, correct_answer: value })
                            }
                          >
                            <SelectTrigger className="mt-2">
                              <SelectValue placeholder="Select correct answer" />
                            </SelectTrigger>
                            <SelectContent>
                              {editingQuestion.options?.map((option, idx) => (
                                <SelectItem key={idx} value={option}>
                                  {option}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-foreground font-medium mb-3">{question.question}</p>
                    {question.type === "mcq" && question.options && (
                      <ul className="space-y-2">
                        {question.options.map((option, idx) => (
                          <li
                            key={idx}
                            className={`text-sm flex items-center gap-2 p-2 rounded ${
                              option === question.correct_answer
                                ? "bg-green-500/10 text-green-700 dark:text-green-400"
                                : "text-muted-foreground"
                            }`}
                          >
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs shrink-0">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            <span className="flex-1">{option}</span>
                            {option === question.correct_answer && (
                              <CheckCircle2 className="w-4 h-4 text-green-600 dark:text-green-400 shrink-0" />
                            )}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}
              </Card>
            ))}

            <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="w-full">
                  <Plus className="w-4 h-4 mr-2" />
                  Add New Question
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Question</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Question Type</Label>
                    <RadioGroup value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as "mcq" | "open")} className="mt-2">
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="mcq" id="mcq" />
                        <Label htmlFor="mcq">Multiple Choice (MCQ)</Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="open" id="open" />
                        <Label htmlFor="open">Open-Ended</Label>
                      </div>
                    </RadioGroup>
                  </div>

                  <div>
                    <Label>Question Text</Label>
                    <Textarea
                      value={newQuestionText}
                      onChange={(e) => setNewQuestionText(e.target.value)}
                      placeholder="Enter your question..."
                      className="min-h-[100px] mt-2"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Skill (Optional)</Label>
                      <Input
                        value={newSkill}
                        onChange={(e) => setNewSkill(e.target.value)}
                        placeholder="e.g., Process analysis"
                        className="mt-2"
                      />
                    </div>
                    {newQuestionType === "mcq" && (
                      <div>
                        <Label>Difficulty</Label>
                        <Select value={newDifficulty} onValueChange={(v: "easy" | "medium" | "hard") => setNewDifficulty(v)}>
                          <SelectTrigger className="mt-2">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="easy">Easy</SelectItem>
                            <SelectItem value="medium">Medium</SelectItem>
                            <SelectItem value="hard">Hard</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    )}
                  </div>

                  {newQuestionType === "mcq" && (
                    <div>
                      <Label>Options</Label>
                      <div className="space-y-2 mt-2">
                        {newOptions.map((option, idx) => (
                          <Input
                            key={idx}
                            value={option}
                            onChange={(e) => {
                              const updated = [...newOptions];
                              updated[idx] = e.target.value;
                              setNewOptions(updated);
                            }}
                            placeholder={`Option ${idx + 1}`}
                          />
                        ))}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setNewOptions([...newOptions, ""])}
                        >
                          <Plus className="w-4 h-4 mr-2" />
                          Add Option
                        </Button>
                      </div>

                      <div className="mt-4">
                        <Label>Correct Answer</Label>
                        <Select value={newCorrectAnswer} onValueChange={setNewCorrectAnswer}>
                          <SelectTrigger className="mt-2">
                            <SelectValue placeholder="Select correct answer" />
                          </SelectTrigger>
                          <SelectContent>
                            {newOptions.filter(o => o.trim()).map((option, idx) => (
                              <SelectItem key={idx} value={option}>
                                {option}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}

                  <Button
                    onClick={handleAddQuestion}
                    disabled={!newQuestionText.trim() || (newQuestionType === "mcq" && newOptions.filter(o => o.trim()).length < 2)}
                    className="w-full"
                  >
                    Add Question
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Right Section - Summary */}
          <div className="w-[30%] min-w-[300px]">
            <Card className="p-6 sticky top-0 space-y-6">
              <div>
                <h3 className="font-semibold text-lg text-foreground mb-4">Question Summary</h3>
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Total Questions:</span>
                    <span className="font-semibold text-foreground">{questions.length}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">MCQ:</span>
                    <span className="font-semibold text-foreground">{mcqCount}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Open-Ended:</span>
                    <span className="font-semibold text-foreground">{openCount}</span>
                  </div>
                </div>
              </div>

              {(easyCount > 0 || mediumCount > 0 || hardCount > 0) && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-sm text-foreground mb-3">Difficulty Breakdown</h4>
                  <div className="space-y-2 text-sm">
                    {easyCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-green-600 dark:text-green-400">Easy:</span>
                        <span className="font-semibold">{easyCount}</span>
                      </div>
                    )}
                    {mediumCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-yellow-600 dark:text-yellow-400">Medium:</span>
                        <span className="font-semibold">{mediumCount}</span>
                      </div>
                    )}
                    {hardCount > 0 && (
                      <div className="flex justify-between">
                        <span className="text-red-600 dark:text-red-400">Hard:</span>
                        <span className="font-semibold">{hardCount}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {skills.length > 0 && (
                <div className="border-t border-border pt-4">
                  <h4 className="font-medium text-sm text-foreground mb-3">Skills Coverage</h4>
                  <div className="flex flex-wrap gap-2">
                    {skills.map((skill, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleSaveAndContinue} className="w-full">
                Save Questions & Continue
              </Button>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};
