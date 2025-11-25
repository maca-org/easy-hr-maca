import { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthHeader from "@/components/AuthHeader";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Mail, Phone, ChevronDown, ArrowLeft } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

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
  insights: {
    matching: string[];
    not_matching: string[];
  };
}

export default function CandidatesDashboard() {
  const [searchParams] = useSearchParams();
  const jobId = searchParams.get("id");
  const navigate = useNavigate();
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [jobTitle, setJobTitle] = useState("");

  useEffect(() => {
    if (!jobId) return;

    const fetchData = async () => {
      try {
        // Fetch job title
        const { data: jobData } = await supabase
          .from("job_openings")
          .select("title")
          .eq("id", jobId)
          .single();

        if (jobData) {
          setJobTitle(jobData.title || "Job Opening");
        }

        // Fetch candidates
        const { data: candidatesData } = await supabase
          .from("candidates")
          .select("*")
          .eq("job_id", jobId)
          .order("created_at", { ascending: false });

        if (candidatesData) {
          setCandidates(candidatesData.map(c => ({
            ...c,
            insights: (c.insights as any) || { matching: [], not_matching: [] }
          })));
        }
      } catch (error) {
        console.error("Error fetching data:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [jobId]);

  const calculateOverallScore = (candidate: Candidate) => {
    const scores = [candidate.cv_rate];
    if (candidate.test_result !== null) scores.push(candidate.test_result);
    if (candidate.ai_interview_score !== null) scores.push(candidate.ai_interview_score);
    return Math.round(scores.reduce((a, b) => a + b, 0) / scores.length);
  };

  const cvAbove80 = candidates.filter(c => c.cv_rate >= 80).length;
  const cvBelow80 = candidates.filter(c => c.cv_rate < 80).length;

  const testAbove80 = candidates.filter(c => c.test_result !== null && c.test_result >= 80).length;
  const testBelow80 = candidates.filter(c => c.test_result !== null && c.test_result < 80).length;

  const completedTests = candidates.filter(c => c.completed_test).length;
  const pendingTests = candidates.filter(c => !c.completed_test).length;

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col bg-background">
        <AuthHeader />
        <main className="flex-1 p-6">
          <div className="max-w-7xl mx-auto">
            <p className="text-muted-foreground">Yükleniyor...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <AuthHeader />
      <main className="flex-1 p-6">
        <div className="max-w-7xl mx-auto space-y-6">
          {/* Header */}
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(`/questions-review?id=${jobId}`)}
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">{jobTitle}</h1>
              <p className="text-muted-foreground">Aday Değerlendirme Paneli</p>
            </div>
          </div>

          {/* Stats Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">CV Değerlendirme</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">%80 Üzeri:</span>
                  <span className="text-2xl font-bold text-green-600">{cvAbove80}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">%80 Altı:</span>
                  <span className="text-2xl font-bold text-red-600">{cvBelow80}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Sonuçları</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">%80 Üzeri:</span>
                  <span className="text-2xl font-bold text-green-600">{testAbove80}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">%80 Altı:</span>
                  <span className="text-2xl font-bold text-red-600">{testBelow80}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Test Tamamlanma</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Tamamlandı:</span>
                  <span className="text-2xl font-bold text-blue-600">{completedTests}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-muted-foreground">Bekliyor:</span>
                  <span className="text-2xl font-bold text-orange-600">{pendingTests}</span>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Candidates Table */}
          <Card>
            <CardHeader>
              <CardTitle>Adaylar</CardTitle>
            </CardHeader>
            <CardContent>
              {candidates.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  Henüz aday bulunmuyor
                </p>
              ) : (
                <div className="space-y-2">
                  {/* Table Header */}
                  <div className="grid grid-cols-[80px_200px_100px_100px_100px_80px_60px] gap-4 px-4 py-2 bg-muted/50 rounded-lg text-sm font-medium text-muted-foreground">
                    <div>Skor</div>
                    <div>Aday</div>
                    <div>CV Oranı</div>
                    <div>Test Sonucu</div>
                    <div>AI Görüşme</div>
                    <div className="text-center">İletişim</div>
                    <div></div>
                  </div>

                  {/* Table Rows */}
                  {candidates.map((candidate) => {
                    const overallScore = calculateOverallScore(candidate);
                    const scoreColor =
                      overallScore >= 80
                        ? "text-green-600"
                        : overallScore >= 60
                        ? "text-yellow-600"
                        : "text-red-600";

                    return (
                      <div
                        key={candidate.id}
                        className="grid grid-cols-[80px_200px_100px_100px_100px_80px_60px] gap-4 px-4 py-4 border rounded-lg hover:bg-muted/30 transition-colors items-center"
                      >
                        {/* Overall Score */}
                        <div className={`text-2xl font-bold ${scoreColor}`}>
                          {overallScore}%
                        </div>

                        {/* Name & Title */}
                        <div>
                          <p className="font-medium text-foreground">{candidate.name}</p>
                          {candidate.title && (
                            <p className="text-sm text-muted-foreground">{candidate.title}</p>
                          )}
                        </div>

                        {/* CV Rate */}
                        <div className="text-center">
                          <span
                            className={`font-semibold ${
                              candidate.cv_rate >= 80 ? "text-green-600" : "text-red-600"
                            }`}
                          >
                            {candidate.cv_rate}%
                          </span>
                        </div>

                        {/* Test Result */}
                        <div className="text-center">
                          {candidate.test_result !== null ? (
                            <span
                              className={`font-semibold ${
                                candidate.test_result >= 80 ? "text-green-600" : "text-red-600"
                              }`}
                            >
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
                            <span className="text-muted-foreground text-sm">Yakında</span>
                          )}
                        </div>

                        {/* Contact Actions */}
                        <div className="flex items-center justify-center gap-2">
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
                        </div>

                        {/* Insights Dropdown */}
                        <div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-80">
                              <div className="p-4 space-y-3">
                                <div>
                                  <h4 className="font-semibold text-sm text-green-600 mb-2">
                                    ✓ İş Tanımına Uygun
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
                                    ✗ İş Tanımına Uygun Değil
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
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
}
