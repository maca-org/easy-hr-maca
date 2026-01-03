import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, UserCircle, ChevronRight, ChevronDown, Download, Trash2, Building2, Briefcase, Calendar, FileText, Award } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface CandidateProfile {
  id: string;
  email: string;
  created_at: string;
}

interface ApplicationDetail {
  id: string;
  job_id: string;
  job_title: string;
  applied_at: string | null;
  cv_rate: number;
  test_result: number | null;
  completed_test: boolean;
}

interface CompanyApplications {
  company_name: string | null;
  hr_user_id: string;
  applications: ApplicationDetail[];
}

interface CandidateWithApplications extends CandidateProfile {
  total_applications: number;
  applications_by_company: CompanyApplications[];
}

export const CandidateManager = () => {
  const [candidates, setCandidates] = useState<CandidateWithApplications[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [expandedCandidates, setExpandedCandidates] = useState<Set<string>>(new Set());
  const [expandedCompanies, setExpandedCompanies] = useState<Set<string>>(new Set());
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    fetchCandidates();
  }, []);

  const fetchCandidates = async () => {
    setLoading(true);
    
    try {
      // 1. Get all candidate profiles
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("id, email, created_at")
        .eq("account_type", "candidate")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Get all candidate applications (where applicant_user_id is not null)
      const { data: applications, error: applicationsError } = await supabase
        .from("candidates")
        .select("id, job_id, applicant_user_id, applied_at, cv_rate, test_result, completed_test")
        .not("applicant_user_id", "is", null);

      if (applicationsError) throw applicationsError;

      // 3. Get all job openings with HR info
      const { data: jobs, error: jobsError } = await supabase
        .from("job_openings")
        .select("id, title, user_id");

      if (jobsError) throw jobsError;

      // 4. Get HR profiles for company names
      const { data: hrProfiles, error: hrProfilesError } = await supabase
        .from("profiles")
        .select("id, company_name")
        .eq("account_type", "hr");

      if (hrProfilesError) throw hrProfilesError;

      // 5. Build the data structure
      const candidatesData: CandidateWithApplications[] = (profiles || []).map((profile) => {
        // Find all applications for this candidate
        const candidateApps = (applications || []).filter(app => app.applicant_user_id === profile.id);
        
        // Group applications by company (HR user)
        const companyMap = new Map<string, CompanyApplications>();
        
        candidateApps.forEach(app => {
          const job = jobs?.find(j => j.id === app.job_id);
          if (!job) return;
          
          const hrProfile = hrProfiles?.find(p => p.id === job.user_id);
          const hrUserId = job.user_id || 'unknown';
          
          if (!companyMap.has(hrUserId)) {
            companyMap.set(hrUserId, {
              company_name: hrProfile?.company_name || null,
              hr_user_id: hrUserId,
              applications: []
            });
          }
          
          companyMap.get(hrUserId)!.applications.push({
            id: app.id,
            job_id: app.job_id,
            job_title: job.title || "Untitled Position",
            applied_at: app.applied_at,
            cv_rate: app.cv_rate,
            test_result: app.test_result,
            completed_test: app.completed_test
          });
        });

        return {
          id: profile.id,
          email: profile.email,
          created_at: profile.created_at,
          total_applications: candidateApps.length,
          applications_by_company: Array.from(companyMap.values())
        };
      });

      setCandidates(candidatesData);
    } catch (error) {
      toast.error("Failed to fetch candidates");
      console.error(error);
    }
    
    setLoading(false);
  };

  const deleteUser = async (userId: string) => {
    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("Candidate deleted successfully");
      fetchCandidates();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete candidate");
    } finally {
      setDeletingUser(false);
      setDeleteUserId(null);
    }
  };

  const toggleCandidateExpanded = (candidateId: string) => {
    setExpandedCandidates(prev => {
      const newSet = new Set(prev);
      if (newSet.has(candidateId)) {
        newSet.delete(candidateId);
      } else {
        newSet.add(candidateId);
      }
      return newSet;
    });
  };

  const toggleCompanyExpanded = (key: string) => {
    setExpandedCompanies(prev => {
      const newSet = new Set(prev);
      if (newSet.has(key)) {
        newSet.delete(key);
      } else {
        newSet.add(key);
      }
      return newSet;
    });
  };

  const filteredCandidates = candidates.filter((candidate) => 
    candidate.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const stats = {
    total: candidates.length,
    withApplications: candidates.filter(c => c.total_applications > 0).length,
    totalApplications: candidates.reduce((sum, c) => sum + c.total_applications, 0)
  };

  const exportToCSV = () => {
    const headers = ['Email', 'Kayıt Tarihi', 'Toplam Başvuru', 'Şirket', 'Pozisyon', 'Başvuru Tarihi', 'CV Rate', 'Assessment'];
    const csvRows = [headers.join(',')];

    filteredCandidates.forEach(candidate => {
      if (candidate.applications_by_company.length === 0) {
        csvRows.push([
          `"${candidate.email}"`,
          format(new Date(candidate.created_at), 'yyyy-MM-dd'),
          0,
          '"-"',
          '"-"',
          '"-"',
          '"-"',
          '"-"'
        ].join(','));
      } else {
        candidate.applications_by_company.forEach(company => {
          company.applications.forEach(app => {
            csvRows.push([
              `"${candidate.email}"`,
              format(new Date(candidate.created_at), 'yyyy-MM-dd'),
              candidate.total_applications,
              `"${company.company_name || 'Unknown'}"`,
              `"${app.job_title}"`,
              app.applied_at ? format(new Date(app.applied_at), 'yyyy-MM-dd') : '-',
              app.cv_rate || '-',
              app.completed_test ? (app.test_result || '-') : '-'
            ].join(','));
          });
        });
      }
    });

    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `candidates_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV exported successfully");
  };

  const getCvRateBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{rate}%</Badge>;
    if (rate >= 60) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{rate}%</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{rate}%</Badge>;
  };

  const getAssessmentBadge = (completed: boolean, result: number | null) => {
    if (!completed) return <Badge variant="outline">Not taken</Badge>;
    if (result === null) return <Badge variant="secondary">In progress</Badge>;
    if (result >= 80) return <Badge className="bg-green-100 text-green-700 hover:bg-green-100">{result}%</Badge>;
    if (result >= 60) return <Badge className="bg-yellow-100 text-yellow-700 hover:bg-yellow-100">{result}%</Badge>;
    return <Badge className="bg-red-100 text-red-700 hover:bg-red-100">{result}%</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <RefreshCw className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <UserCircle className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Toplam Aday</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Briefcase className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Başvuran Aday</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.withApplications}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Toplam Başvuru</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.totalApplications}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters & Actions */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCircle className="h-5 w-5" />
            Aday Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email ile ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button variant="outline" onClick={fetchCandidates} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Yenile
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
          </div>

          {/* Candidates Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead>Başvuru Sayısı</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredCandidates.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                      Aday bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredCandidates.map((candidate) => {
                    const isExpanded = expandedCandidates.has(candidate.id);
                    const hasApplications = candidate.applications_by_company.length > 0;
                    
                    return (
                      <Collapsible key={candidate.id} asChild open={isExpanded}>
                        <>
                          <TableRow className="hover:bg-muted/50">
                            <TableCell>
                              {hasApplications && (
                                <CollapsibleTrigger asChild>
                                  <Button 
                                    variant="ghost" 
                                    size="icon" 
                                    className="h-6 w-6"
                                    onClick={() => toggleCandidateExpanded(candidate.id)}
                                  >
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{candidate.email}</TableCell>
                            <TableCell>
                              {format(new Date(candidate.created_at), "d MMM yyyy", { locale: tr })}
                            </TableCell>
                            <TableCell>
                              <Badge variant={candidate.total_applications > 0 ? "default" : "outline"}>
                                {candidate.total_applications}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="icon"
                                onClick={() => setDeleteUserId(candidate.id)}
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                          
                          {/* Company Level */}
                          <CollapsibleContent asChild>
                            <>
                              {candidate.applications_by_company.map((company, companyIndex) => {
                                const companyKey = `${candidate.id}-${company.hr_user_id}`;
                                const isCompanyExpanded = expandedCompanies.has(companyKey);
                                
                                return (
                                  <Collapsible key={companyKey} asChild open={isCompanyExpanded}>
                                    <>
                                      <TableRow className="bg-muted/30">
                                        <TableCell></TableCell>
                                        <TableCell colSpan={4}>
                                          <div className="flex items-center gap-2 py-1">
                                            <Button 
                                              variant="ghost" 
                                              size="icon" 
                                              className="h-6 w-6"
                                              onClick={() => toggleCompanyExpanded(companyKey)}
                                            >
                                              {isCompanyExpanded ? (
                                                <ChevronDown className="h-4 w-4" />
                                              ) : (
                                                <ChevronRight className="h-4 w-4" />
                                              )}
                                            </Button>
                                            <Building2 className="h-4 w-4 text-muted-foreground" />
                                            <span className="font-medium">
                                              {company.company_name || "Unknown Company"}
                                            </span>
                                            <Badge variant="secondary" className="ml-2">
                                              {company.applications.length} pozisyon
                                            </Badge>
                                          </div>
                                        </TableCell>
                                      </TableRow>
                                      
                                      {/* Position Level */}
                                      <CollapsibleContent asChild>
                                        <>
                                          {company.applications.map((app) => (
                                            <TableRow key={app.id} className="bg-muted/10">
                                              <TableCell></TableCell>
                                              <TableCell colSpan={4}>
                                                <div className="flex items-center gap-4 pl-10 py-2">
                                                  <div className="flex items-center gap-2 min-w-[200px]">
                                                    <Briefcase className="h-4 w-4 text-muted-foreground" />
                                                    <span>{app.job_title}</span>
                                                  </div>
                                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                                    <Calendar className="h-3 w-3" />
                                                    {app.applied_at 
                                                      ? format(new Date(app.applied_at), "d MMM yyyy", { locale: tr })
                                                      : "-"
                                                    }
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">CV:</span>
                                                    {getCvRateBadge(app.cv_rate)}
                                                  </div>
                                                  <div className="flex items-center gap-2">
                                                    <span className="text-xs text-muted-foreground">Assessment:</span>
                                                    {getAssessmentBadge(app.completed_test, app.test_result)}
                                                  </div>
                                                </div>
                                              </TableCell>
                                            </TableRow>
                                          ))}
                                        </>
                                      </CollapsibleContent>
                                    </>
                                  </Collapsible>
                                );
                              })}
                            </>
                          </CollapsibleContent>
                        </>
                      </Collapsible>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Adayı Sil</AlertDialogTitle>
            <AlertDialogDescription>
              Bu işlem geri alınamaz. Aday hesabı ve tüm başvuruları kalıcı olarak silinecek.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUser(deleteUserId)}
              disabled={deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser ? "Siliniyor..." : "Sil"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
