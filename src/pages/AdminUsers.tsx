import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Header } from "@/components/Header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Search, Users, Crown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface UserProfile {
  id: string;
  email: string;
  company_name: string | null;
  plan_type: string;
  created_at: string;
  monthly_unlocked_count: number;
}

const PLAN_OPTIONS = [
  { value: "free", label: "Free", limit: 25, color: "bg-muted text-muted-foreground" },
  { value: "starter", label: "Starter", limit: 100, color: "bg-green-500/10 text-green-600" },
  { value: "pro", label: "Pro", limit: 250, color: "bg-blue-500/10 text-blue-600" },
  { value: "business", label: "Business", limit: 1000, color: "bg-purple-500/10 text-purple-600" },
];

export default function AdminUsers() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [updatingUserId, setUpdatingUserId] = useState<string | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, email, company_name, plan_type, created_at, monthly_unlocked_count")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setUsers(data || []);
    } catch (error) {
      console.error("Error fetching users:", error);
      toast.error("Kullanıcılar yüklenirken hata oluştu");
    } finally {
      setLoading(false);
    }
  };

  const handlePlanChange = async (userId: string, newPlan: string) => {
    setUpdatingUserId(userId);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error("Oturum bulunamadı");
        return;
      }

      const { data, error } = await supabase.functions.invoke("admin-update-plan", {
        body: { userId, newPlan },
      });

      if (error) throw error;

      if (data?.success) {
        setUsers(prev => 
          prev.map(user => 
            user.id === userId ? { ...user, plan_type: newPlan } : user
          )
        );
        toast.success(`Plan başarıyla ${newPlan} olarak güncellendi`);
      } else {
        throw new Error(data?.error || "Bilinmeyen hata");
      }
    } catch (error: any) {
      console.error("Error updating plan:", error);
      toast.error(error.message || "Plan güncellenirken hata oluştu");
    } finally {
      setUpdatingUserId(null);
    }
  };

  const filteredUsers = users.filter(user => 
    user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (user.company_name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getPlanInfo = (planType: string) => {
    return PLAN_OPTIONS.find(p => p.value === planType) || PLAN_OPTIONS[0];
  };

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto py-8 px-4">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <Crown className="h-6 w-6 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-2xl">Admin Panel - Kullanıcı Yönetimi</CardTitle>
                  <p className="text-muted-foreground mt-1">
                    Toplam {users.length} kullanıcı
                  </p>
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {/* Search */}
            <div className="relative mb-6">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Email veya şirket adı ile ara..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Users Table */}
            {loading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Users className="h-12 w-12 mb-4" />
                <p>Kullanıcı bulunamadı</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Email</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Şirket</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Mevcut Plan</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Kullanım</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Kayıt Tarihi</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Plan Değiştir</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user) => {
                      const planInfo = getPlanInfo(user.plan_type);
                      return (
                        <tr key={user.id} className="border-b border-border hover:bg-muted/50 transition-colors">
                          <td className="py-4 px-4">
                            <span className="font-medium">{user.email}</span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-muted-foreground">
                              {user.company_name || "-"}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Badge className={planInfo.color}>
                              {planInfo.label}
                            </Badge>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-muted-foreground">
                              {user.monthly_unlocked_count || 0} / {planInfo.limit}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className="text-sm text-muted-foreground">
                              {format(new Date(user.created_at), "dd MMM yyyy")}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <Select
                              value={user.plan_type}
                              onValueChange={(value) => handlePlanChange(user.id, value)}
                              disabled={updatingUserId === user.id}
                            >
                              <SelectTrigger className="w-[140px]">
                                {updatingUserId === user.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <SelectValue />
                                )}
                              </SelectTrigger>
                              <SelectContent>
                                {PLAN_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label} ({option.limit})
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
