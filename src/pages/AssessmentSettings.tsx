import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon, ArrowLeft, Send, Loader2 } from "lucide-react";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import AuthHeader from "@/components/AuthHeader";

interface Candidate {
  id: string;
  name: string;
  email: string;
  cv_rate: number;
}

export default function AssessmentSettings() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const jobId = searchParams.get("id");

  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [selectedCandidates, setSelectedCandidates] = useState<Set<string>>(new Set());
  const [dueDate, setDueDate] = useState<Date>();
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    if (!jobId) {
      navigate("/jobs");
      return;
    }
    fetchCandidates();
    fetchJobTitle();
  }, [jobId]);

  const fetchJobTitle = async () => {
    const { data } = await supabase
      .from("job_openings")
      .select("title")
      .eq("id", jobId)
      .single();
    
    if (data) setJobTitle(data.title || "Untitled Job");
  };

  const fetchCandidates = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("candidates")
      .select("id, name, email, cv_rate, assessment_sent")
      .eq("job_id", jobId)
      .eq("assessment_sent", false) // Only show candidates who haven't received assessment
      .order("cv_rate", { ascending: false });

    if (error) {
      toast.error("Failed to load candidates");
      console.error(error);
    } else {
      setCandidates(data || []);
      // Pre-select candidates with CV rate >= 80%
      const highScorers = new Set(
        (data || []).filter(c => c.cv_rate >= 80).map(c => c.id)
      );
      setSelectedCandidates(highScorers);
    }
    setLoading(false);
  };

  const toggleCandidate = (candidateId: string) => {
    setSelectedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const handleSendAssessments = async () => {
    if (selectedCandidates.size === 0) {
      toast.error("Please select at least one candidate");
      return;
    }

    if (!dueDate) {
      toast.error("Please select a due date");
      return;
    }

    setSending(true);

    try {
      // Set due date to 23:59:59 of the selected day
      const dueDateWithTime = new Date(dueDate);
      dueDateWithTime.setHours(23, 59, 59, 999);

      const { data, error } = await supabase.functions.invoke("send-assessments", {
        body: {
          jobId,
          candidateIds: Array.from(selectedCandidates),
          dueDate: dueDateWithTime.toISOString(),
        },
      });

      if (error) throw error;

      toast.success(`Assessments sent to ${selectedCandidates.size} candidate(s)!`);
      setTimeout(() => {
        navigate(`/candidates-dashboard?id=${jobId}`);
      }, 1500);
    } catch (error: any) {
      console.error("Error sending assessments:", error);
      toast.error("Failed to send assessments: " + (error.message || "Unknown error"));
    } finally {
      setSending(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AuthHeader />
        <div className="flex items-center justify-center h-[80vh]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="container mx-auto p-6 max-w-4xl">
        <div className="flex items-center gap-4 mb-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate(`/questions-review?id=${jobId}`)}
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Send Assessments</h1>
            <p className="text-muted-foreground">{jobTitle}</p>
          </div>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Select Candidates</CardTitle>
              <CardDescription>
                Choose which candidates should receive the assessment
              </CardDescription>
              <div className="flex flex-wrap gap-2 pt-3">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const above25 = new Set(
                      candidates.filter(c => c.cv_rate >= 25).map(c => c.id)
                    );
                    setSelectedCandidates(above25);
                  }}
                >
                  Above 25%
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    const above80 = new Set(
                      candidates.filter(c => c.cv_rate >= 80).map(c => c.id)
                    );
                    setSelectedCandidates(above80);
                  }}
                >
                  Above 80%
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedCandidates(new Set())}
                >
                  Clear All
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {candidates.map((candidate) => (
                  <div
                    key={candidate.id}
                    className="flex items-center space-x-3 p-3 rounded-lg border hover:bg-muted/50 transition-colors"
                  >
                    <Checkbox
                      id={candidate.id}
                      checked={selectedCandidates.has(candidate.id)}
                      onCheckedChange={() => toggleCandidate(candidate.id)}
                    />
                    <label
                      htmlFor={candidate.id}
                      className="flex-1 flex items-center justify-between cursor-pointer"
                    >
                      <div>
                        <p className="font-medium">{candidate.name}</p>
                        <p className="text-sm text-muted-foreground">{candidate.email}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">CV Score:</span>
                        <span
                          className={cn(
                            "px-2 py-1 rounded text-sm font-semibold",
                            candidate.cv_rate >= 80
                              ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100"
                              : "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-100"
                          )}
                        >
                          {candidate.cv_rate}%
                        </span>
                      </div>
                    </label>
                  </div>
                ))}
              </div>

              {candidates.length === 0 && (
                <p className="text-center text-muted-foreground py-8">
                  All candidates have already received assessments for this job.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Assessment Due Date</CardTitle>
              <CardDescription>
                Set the deadline for candidates to complete the assessment
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "w-full justify-start text-left font-normal",
                      !dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "PPP") : <span>Pick a date</span>}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar
                    mode="single"
                    selected={dueDate}
                    onSelect={setDueDate}
                    disabled={(date) => date < new Date()}
                    initialFocus
                    className="pointer-events-auto"
                  />
                </PopoverContent>
              </Popover>
            </CardContent>
          </Card>

          <Card className="border-primary/20">
            <CardHeader>
              <CardTitle>Summary</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Selected Candidates:</span>
                <span className="font-semibold">{selectedCandidates.size}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Due Date:</span>
                <span className="font-semibold">
                  {dueDate ? format(dueDate, "PPP") : "Not set"}
                </span>
              </div>
            </CardContent>
          </Card>

          <Button
            size="lg"
            className="w-full"
            onClick={handleSendAssessments}
            disabled={sending || selectedCandidates.size === 0 || !dueDate}
          >
            {sending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending Assessments...
              </>
            ) : (
              <>
                <Send className="mr-2 h-4 w-4" />
                Send Assessments to Selected Candidates
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
