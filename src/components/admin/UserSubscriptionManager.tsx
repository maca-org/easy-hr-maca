import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { Search, RefreshCw, Users, CreditCard, RotateCcw } from "lucide-react";
import { format } from "date-fns";

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

const PLAN_LIMITS: Record<string, number> = {
  free: 25,
  starter: 50,
  pro: 150,
  business: 500,
};

const PLAN_OPTIONS = ["free", "starter", "pro", "business"];

export const UserSubscriptionManager = () => {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("profiles")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      toast.error("Kullanıcılar yüklenemedi");
      console.error(error);
    } else {
      setUsers(data || []);
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
      fetchUsers();
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
      fetchUsers();
    }
    setUpdatingUserId(null);
  };

  const filteredUsers = users.filter((user) => {
    const matchesSearch = 
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (user.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ?? false);
    
    const matchesPlan = planFilter === "all" || user.plan_type === planFilter;
    
    return matchesSearch && matchesPlan;
  });

  const stats = {
    total: users.length,
    free: users.filter(u => u.plan_type === "free" || !u.plan_type).length,
    starter: users.filter(u => u.plan_type === "starter").length,
    pro: users.filter(u => u.plan_type === "pro").length,
    business: users.filter(u => u.plan_type === "business").length,
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
            <Button variant="outline" onClick={fetchUsers} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Yenile
            </Button>
          </div>

          {/* Users Table */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Şirket</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Kredi Kullanımı</TableHead>
                  <TableHead>Kayıt Tarihi</TableHead>
                  <TableHead className="text-right">İşlemler</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredUsers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                      Kullanıcı bulunamadı
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredUsers.map((user) => {
                    const planType = user.plan_type || "free";
                    const limit = PLAN_LIMITS[planType] || 25;
                    const used = user.monthly_unlocked_count || 0;
                    
                    return (
                      <TableRow key={user.id}>
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
                          {format(new Date(user.created_at), "dd MMM yyyy")}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resetUserCredits(user.id)}
                            disabled={updatingUserId === user.id}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            Sıfırla
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>

          <p className="text-xs text-muted-foreground mt-4">
            Toplam {filteredUsers.length} kullanıcı gösteriliyor
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
