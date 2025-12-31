import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, Users, CreditCard, RotateCcw, ChevronRight, ChevronDown, Download, FileSpreadsheet, Briefcase, FileText, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { tr } from "date-fns/locale";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

interface UserProfile {
  id: string;
  email: string;
  company_name: string | null;
  plan_type: string | null;
  monthly_unlocked_count: number | null;
  billing_period_start: string | null;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  created_at: string;
}

interface JobStats {
  job_id: string;
  title: string;
  total_candidates: number;
  cv_analyzed: number;
  assessment_completed: number;
}

interface UserWithStats extends UserProfile {
  job_count: number;
  total_candidates: number;
  job_stats: JobStats[];
}

const PLAN_LIMITS: Record<string, number> = {
  free: 25,
  starter: 50,
  pro: 150,
  business: 500,
};

const PLAN_OPTIONS = ["free", "starter", "pro", "business"];

export const UserSubscriptionManager = () => {
  const [usersWithStats, setUsersWithStats] = useState<UserWithStats[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);
  const [expandedUsers, setExpandedUsers] = useState<Set<string>>(new Set());
  const [deleteUserId, setDeleteUserId] = useState<string | null>(null);
  const [deletingUser, setDeletingUser] = useState(false);

  useEffect(() => {
    fetchUsersWithStats();
  }, []);

  const fetchUsersWithStats = async () => {
    setLoading(true);
    
    try {
      // 1. Tüm profilleri çek
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false });

      if (profilesError) throw profilesError;

      // 2. Tüm job_openings'leri çek
      const { data: jobs, error: jobsError } = await supabase
        .from("job_openings")
        .select("id, user_id, title");

      if (jobsError) throw jobsError;

      // 3. Tüm candidates'leri çek
      const { data: candidates, error: candidatesError } = await supabase
        .from("candidates")
        .select("job_id, cv_rate, completed_test");

      if (candidatesError) throw candidatesError;

      // 4. Verileri birleştir
      const usersData: UserWithStats[] = (profiles || []).map((profile) => {
        const userJobs = (jobs || []).filter(job => job.user_id === profile.id);
        
        const jobStats: JobStats[] = userJobs.map(job => {
          const jobCandidates = (candidates || []).filter(c => c.job_id === job.id);
          return {
            job_id: job.id,
            title: job.title || "İsimsiz İlan",
            total_candidates: jobCandidates.length,
            cv_analyzed: jobCandidates.filter(c => c.cv_rate != null && c.cv_rate > 0).length,
            assessment_completed: jobCandidates.filter(c => c.completed_test === true).length,
          };
        });

        const totalCandidates = jobStats.reduce((sum, job) => sum + job.total_candidates, 0);

        return {
          ...profile,
          job_count: userJobs.length,
          total_candidates: totalCandidates,
          job_stats: jobStats,
        };
      });

      setUsersWithStats(usersData);
    } catch (error) {
      toast.error("Kullanıcılar yüklenemedi");
      console.error(error);
    }
    
    setLoading(false);
  };

  const updateUserPlan = async (userId: string, newPlan: string) => {
    setUpdatingUserId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ plan_type: newPlan })
      .eq("id", userId);

    if (error) {
      toast.error("Plan güncellenemedi");
      console.error(error);
    } else {
      toast.success("Plan güncellendi");
      fetchUsersWithStats();
    }
    setUpdatingUserId(null);
  };

  const resetUserCredits = async (userId: string) => {
    setUpdatingUserId(userId);
    const { error } = await supabase
      .from("profiles")
      .update({ 
        monthly_unlocked_count: 0,
        billing_period_start: new Date().toISOString(),
        limit_warning_sent: false
      })
      .eq("id", userId);

    if (error) {
      toast.error("Krediler sıfırlanamadı");
      console.error(error);
    } else {
      toast.success("Krediler sıfırlandı");
      fetchUsersWithStats();
    }
    setUpdatingUserId(null);
  };

  const deleteUser = async (userId: string) => {
    setDeletingUser(true);
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { userId }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      toast.success("User deleted successfully");
      fetchUsersWithStats();
    } catch (error: any) {
      console.error("Error deleting user:", error);
      toast.error(error.message || "Failed to delete user");
    } finally {
      setDeletingUser(false);
      setDeleteUserId(null);
    }
  };

  const toggleExpanded = (userId: string) => {
    setExpandedUsers(prev => {
      const newSet = new Set(prev);
      if (newSet.has(userId)) {
        newSet.delete(userId);
      } else {
        newSet.add(userId);
      }
      return newSet;
    });
  };

  const filteredUsers = usersWithStats.filter((user) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesPlan = planFilter === "all" || user.plan_type === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  const stats = {
    total: usersWithStats.length,
    free: usersWithStats.filter(u => u.plan_type === "free" || !u.plan_type).length,
    starter: usersWithStats.filter(u => u.plan_type === "starter").length,
    pro: usersWithStats.filter(u => u.plan_type === "pro").length,
    business: usersWithStats.filter(u => u.plan_type === "business").length,
  };

  const getPlanBadgeVariant = (plan: string | null) => {
    switch (plan) {
      case "business": return "default";
      case "pro": return "default";
      case "starter": return "secondary";
      default: return "outline";
    }
  };

  const getUsageColor = (used: number, limit: number) => {
    const percentage = (used / limit) * 100;
    if (percentage >= 100) return "text-destructive";
    if (percentage >= 80) return "text-yellow-600";
    return "text-muted-foreground";
  };

  // CSV Export
  const exportToCSV = () => {
    const headers = ['Email', 'Şirket', 'Plan', 'Kredi Kullanımı', 'Kredi Limiti', 'Job Sayısı', 'Toplam Başvuru', 'Kayıt Tarihi'];
    const csvRows = [
      headers.join(','),
      ...filteredUsers.map(user => {
        const planType = user.plan_type || 'free';
        const limit = PLAN_LIMITS[planType] || 25;
        return [
          `"${user.email}"`,
          `"${user.company_name || '-'}"`,
          planType,
          user.monthly_unlocked_count || 0,
          limit,
          user.job_count,
          user.total_candidates,
          format(new Date(user.created_at), 'yyyy-MM-dd')
        ].join(',');
      })
    ].join('\n');

    const blob = new Blob(['\ufeff' + csvRows], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kullanicilar_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("CSV dosyası indirildi");
  };

  // Detailed CSV Export (with job details)
  const exportDetailedCSV = () => {
    const headers = ['Email', 'Şirket', 'Plan', 'Job Başlığı', 'Başvuru Sayısı', 'CV Analiz', 'Assessment Tamamlanan'];
    const csvRows = [headers.join(',')];

    filteredUsers.forEach(user => {
      if (user.job_stats.length === 0) {
        csvRows.push([
          `"${user.email}"`,
          `"${user.company_name || '-'}"`,
          user.plan_type || 'free',
          '"-"',
          0,
          0,
          0
        ].join(','));
      } else {
        user.job_stats.forEach(job => {
          csvRows.push([
            `"${user.email}"`,
            `"${user.company_name || '-'}"`,
            user.plan_type || 'free',
            `"${job.title}"`,
            job.total_candidates,
            job.cv_analyzed,
            job.assessment_completed
          ].join(','));
        });
      }
    });

    const blob = new Blob(['\ufeff' + csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kullanicilar_detayli_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Detaylı CSV dosyası indirildi");
  };

  // Excel Export (XML-based for compatibility)
  const exportToExcel = () => {
    const xmlHeader = '<?xml version="1.0" encoding="UTF-8"?><?mso-application progid="Excel.Sheet"?>';
    const workbookStart = '<Workbook xmlns="urn:schemas-microsoft-com:office:spreadsheet" xmlns:ss="urn:schemas-microsoft-com:office:spreadsheet">';
    const workbookEnd = '</Workbook>';
    const worksheetStart = '<Worksheet ss:Name="Kullanıcılar"><Table>';
    const worksheetEnd = '</Table></Worksheet>';

    const headers = ['Email', 'Şirket', 'Plan', 'Kredi Kullanımı', 'Kredi Limiti', 'Job Sayısı', 'Toplam Başvuru', 'Kayıt Tarihi'];
    const headerRow = '<Row>' + headers.map(h => `<Cell><Data ss:Type="String">${h}</Data></Cell>`).join('') + '</Row>';

    const dataRows = filteredUsers.map(user => {
      const planType = user.plan_type || 'free';
      const limit = PLAN_LIMITS[planType] || 25;
      const cells = [
        `<Cell><Data ss:Type="String">${user.email}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${user.company_name || '-'}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${planType}</Data></Cell>`,
        `<Cell><Data ss:Type="Number">${user.monthly_unlocked_count || 0}</Data></Cell>`,
        `<Cell><Data ss:Type="Number">${limit}</Data></Cell>`,
        `<Cell><Data ss:Type="Number">${user.job_count}</Data></Cell>`,
        `<Cell><Data ss:Type="Number">${user.total_candidates}</Data></Cell>`,
        `<Cell><Data ss:Type="String">${format(new Date(user.created_at), 'yyyy-MM-dd')}</Data></Cell>`,
      ];
      return '<Row>' + cells.join('') + '</Row>';
    }).join('');

    const xmlContent = xmlHeader + workbookStart + worksheetStart + headerRow + dataRows + worksheetEnd + workbookEnd;

    const blob = new Blob([xmlContent], { type: 'application/vnd.ms-excel' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `kullanicilar_${format(new Date(), 'yyyy-MM-dd')}.xls`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.success("Excel dosyası indirildi");
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
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm text-muted-foreground">Toplam</span>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.total}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="outline">Free</Badge>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.free}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">Starter</Badge>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.starter}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge>Pro</Badge>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.pro}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-4">
            <div className="flex items-center gap-2">
              <Badge>Business</Badge>
            </div>
            <p className="text-2xl font-bold mt-1">{stats.business}</p>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <CreditCard className="h-5 w-5" />
            Kullanıcı & Subscription Yönetimi
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email veya şirket ara..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={planFilter} onValueChange={setPlanFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Plan Filtrele" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tümü</SelectItem>
                <SelectItem value="free">Free</SelectItem>
                <SelectItem value="starter">Starter</SelectItem>
                <SelectItem value="pro">Pro</SelectItem>
                <SelectItem value="business">Business</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" onClick={fetchUsersWithStats} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Yenile
            </Button>
            <Button variant="outline" onClick={exportToCSV} className="gap-2">
              <Download className="h-4 w-4" />
              CSV
            </Button>
            <Button variant="outline" onClick={exportDetailedCSV} className="gap-2">
              <FileText className="h-4 w-4" />
              Detaylı CSV
            </Button>
            <Button variant="outline" onClick={exportToExcel} className="gap-2">
              <FileSpreadsheet className="h-4 w-4" />
              Excel
            </Button>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10"></TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Şirket</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Kredi</TableHead>
                  <TableHead>Jobs</TableHead>
                  <TableHead>Başvurular</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground py-8">
                      Kullanıcı bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const planType = user.plan_type || "free";
                    const limit = PLAN_LIMITS[planType] || 25;
                    const used = user.monthly_unlocked_count || 0;
                    const isExpanded = expandedUsers.has(user.id);
                    const hasJobs = user.job_stats.length > 0;
                    
                    return (
                      <Collapsible key={user.id} asChild open={isExpanded} onOpenChange={() => toggleExpanded(user.id)}>
                        <>
                          <TableRow className={hasJobs ? "cursor-pointer hover:bg-muted/50" : ""}>
                            <TableCell>
                              {hasJobs && (
                                <CollapsibleTrigger asChild>
                                  <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                                    {isExpanded ? (
                                      <ChevronDown className="h-4 w-4" />
                                    ) : (
                                      <ChevronRight className="h-4 w-4" />
                                    )}
                                  </Button>
                                </CollapsibleTrigger>
                              )}
                            </TableCell>
                            <TableCell className="font-medium">{user.email}</TableCell>
                            <TableCell>{user.company_name || "-"}</TableCell>
                            <TableCell>
                              <Select
                                value={planType}
                                onValueChange={(value) => updateUserPlan(user.id, value)}
                                disabled={updatingUserId === user.id}
                              >
                                <SelectTrigger className="w-28">
                                  <SelectValue>
                                    <Badge variant={getPlanBadgeVariant(planType)}>
                                      {planType.charAt(0).toUpperCase() + planType.slice(1)}
                                    </Badge>
                                  </SelectValue>
                                </SelectTrigger>
                                <SelectContent>
                                  {PLAN_OPTIONS.map((plan) => (
                                    <SelectItem key={plan} value={plan}>
                                      {plan.charAt(0).toUpperCase() + plan.slice(1)}
                                    </SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell>
                              <span className={getUsageColor(used, limit)}>
                                {used} / {limit}
                              </span>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Briefcase className="h-3 w-3 text-muted-foreground" />
                                <span>{user.job_count}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-1">
                                <Users className="h-3 w-3 text-muted-foreground" />
                                <span>{user.total_candidates}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {format(new Date(user.created_at), "dd MMM yyyy", { locale: tr })}
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => resetUserCredits(user.id)}
                                  disabled={updatingUserId === user.id}
                                  className="gap-1"
                                >
                                  <RotateCcw className="h-3 w-3" />
                                  Reset
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => setDeleteUserId(user.id)}
                                  className="gap-1 text-destructive hover:text-destructive hover:bg-destructive/10"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                          
                          {/* Expanded Job Details */}
                          <CollapsibleContent asChild>
                            <>
                              {user.job_stats.map((job, index) => (
                                <TableRow key={job.job_id} className="bg-muted/30">
                                  <TableCell></TableCell>
                                  <TableCell colSpan={2} className="pl-8">
                                    <div className="flex items-center gap-2">
                                      <span className="text-muted-foreground">
                                        {index === user.job_stats.length - 1 ? "└─" : "├─"}
                                      </span>
                                      <span className="font-medium text-sm">{job.title}</span>
                                    </div>
                                  </TableCell>
                                  <TableCell colSpan={6}>
                                    <div className="flex items-center gap-6 text-sm">
                                      <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{job.total_candidates}</span> başvuru
                                      </span>
                                      <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{job.cv_analyzed}</span> CV analiz
                                      </span>
                                      <span className="text-muted-foreground">
                                        <span className="font-medium text-foreground">{job.assessment_completed}</span> test
                                      </span>
                                    </div>
                                  </TableCell>
                                </TableRow>
                              ))}
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

          <p className="text-xs text-muted-foreground mt-4">
            Showing {filteredUsers.length} users
          </p>
        </CardContent>
      </Card>

      {/* Delete User Confirmation Dialog */}
      <AlertDialog open={!!deleteUserId} onOpenChange={() => setDeleteUserId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete User Account?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the user's account and all associated data including:
              <ul className="list-disc list-inside mt-2 space-y-1">
                <li>All job openings</li>
                <li>All candidates and their data</li>
                <li>All offer letters</li>
                <li>Subscription history</li>
              </ul>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deletingUser}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteUserId && deleteUser(deleteUserId)}
              disabled={deletingUser}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deletingUser ? "Deleting..." : "Delete User"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
