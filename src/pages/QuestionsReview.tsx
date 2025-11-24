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
import { Edit2, Trash2, Plus, X } from "lucide-react";
import { toast } from "sonner";
import type { Question, Job } from "./Index";

export const QuestionsReview = () => {
  // Get jobs from localStorage
  const getStoredJobs = (): Job[] => {
    const stored = localStorage.getItem("hr-screening-jobs");
    return stored ? JSON.parse(stored) : [];
  };

  const updateStoredJobs = (updatedJobs: Job[]) => {
    localStorage.setItem("hr-screening-jobs", JSON.stringify(updatedJobs));
    setJobs(updatedJobs);
  };
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("id");
  
  const [jobs, setJobs] = useState<Job[]>(getStoredJobs());
  const job = jobs.find(j => j.id === jobId);
  const [questions, setQuestions] = useState<Question[]>(job?.questions || []);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [newQuestionType, setNewQuestionType] = useState<"mcq" | "open">("mcq");
  const [newQuestionText, setNewQuestionText] = useState("");
  const [newOptions, setNewOptions] = useState<string[]>(["", "", "", ""]);

  useEffect(() => {
    if (job) {
      setQuestions(job.questions);
    }
  }, [job]);

  if (!job) {
    return (
      <div className="h-screen flex flex-col bg-background">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-muted-foreground">Job not found</p>
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
    }
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setEditingQuestion(null);
  };

  const handleDelete = (id: string) => {
    setQuestions(questions.filter(q => q.id !== id));
  };

  const handleAddQuestion = () => {
    const newQuestion: Question = {
      id: `${newQuestionType}-${Date.now()}`,
      type: newQuestionType,
      question: newQuestionText,
      options: newQuestionType === "mcq" ? newOptions.filter(o => o.trim()) : undefined
    };
    setQuestions([...questions, newQuestion]);
    setIsAddDialogOpen(false);
    setNewQuestionText("");
    setNewOptions(["", "", "", ""]);
    setNewQuestionType("mcq");
  };

  const handleSaveAndContinue = () => {
    const updatedJobs = jobs.map(job => 
      job.id === jobId ? { ...job, questions } : job
    );
    updateStoredJobs(updatedJobs);
    toast.success("Questions saved successfully!");
    navigate(`/?id=${jobId}`);
  };

  const mcqCount = questions.filter(q => q.type === "mcq").length;
  const openCount = questions.filter(q => q.type === "open").length;

  return (
    <div className="h-screen flex flex-col bg-background">
      <Header />
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="border-b border-border px-8 py-6">
          <h1 className="text-2xl font-bold text-foreground mb-2">Review & Edit Generated Questions</h1>
          <p className="text-muted-foreground">
            These questions were generated based on your Job Description. You can edit, delete, or add new questions.
          </p>
        </div>

        <div className="flex-1 overflow-hidden flex gap-6 px-8 py-6">
          {/* Left Section - Questions List */}
          <div className="flex-1 overflow-y-auto pr-4 space-y-4">
            {questions.map((question) => (
              <Card key={question.id} className="p-6">
                <div className="flex items-start justify-between mb-4">
                  <Badge variant={question.type === "mcq" ? "default" : "secondary"}>
                    {question.type === "mcq" ? "MCQ" : "Open-Ended"}
                  </Badge>
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
                    <Textarea
                      value={editingQuestion.question}
                      onChange={(e) => setEditingQuestion({ ...editingQuestion, question: e.target.value })}
                      className="min-h-[80px]"
                    />
                    {editingQuestion.type === "mcq" && (
                      <div className="space-y-2">
                        <Label>Options</Label>
                        {editingQuestion.options?.map((option, idx) => (
                          <div key={idx} className="flex gap-2">
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
                      </div>
                    )}
                  </div>
                ) : (
                  <div>
                    <p className="text-foreground font-medium mb-3">{question.question}</p>
                    {question.type === "mcq" && question.options && (
                      <ul className="space-y-2">
                        {question.options.map((option, idx) => (
                          <li key={idx} className="text-sm text-muted-foreground flex items-center gap-2">
                            <span className="w-6 h-6 rounded-full bg-muted flex items-center justify-center text-xs">
                              {String.fromCharCode(65 + idx)}
                            </span>
                            {option}
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
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Add New Question</DialogTitle>
                </DialogHeader>
                <div className="space-y-4">
                  <div>
                    <Label>Question Type</Label>
                    <RadioGroup value={newQuestionType} onValueChange={(v) => setNewQuestionType(v as "mcq" | "open")}>
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
                      className="min-h-[100px]"
                    />
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
                <h3 className="font-semibold text-lg text-foreground mb-2">{job.title}</h3>
                <div className="space-y-2 text-sm">
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
