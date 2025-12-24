import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import AuthHeader from "@/components/AuthHeader";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { User, Building2, Mail, Save, ArrowLeft } from "lucide-react";

interface Profile {
  id: string;
  email: string;
  company_name: string | null;
  account_type: string | null;
  plan_type: string | null;
  created_at: string;
}

export default function ProfileSettings() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [companyName, setCompanyName] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        navigate("/auth");
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", session.user.id)
        .single();

      if (error) {
        console.error("Error fetching profile:", error);
        toast.error("Failed to load profile");
      } else if (data) {
        setProfile(data);
        setCompanyName(data.company_name || "");
      }
      
      setLoading(false);
    };

    fetchProfile();
  }, [navigate]);

  const handleSave = async () => {
    if (!profile) return;

    setSaving(true);

    const { error } = await supabase
      .from("profiles")
      .update({
        company_name: companyName.trim() || null,
      })
      .eq("id", profile.id);

    if (error) {
      toast.error("Failed to update profile");
      console.error("Error updating profile:", error);
    } else {
      toast.success("Profile updated successfully");
      setProfile(prev => prev ? { ...prev, company_name: companyName.trim() || null } : null);
    }

    setSaving(false);
  };

  const handleBack = () => {
    if (profile?.account_type === 'candidate') {
      navigate("/my-applications");
    } else {
      navigate("/jobs");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <AuthHeader />
        <div className="container mx-auto px-4 py-8">
          <div className="max-w-2xl mx-auto">
            <div className="animate-pulse space-y-4">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="h-64 bg-muted rounded"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <AuthHeader />
      <div className="container mx-auto px-4 py-8">
        <div className="max-w-2xl mx-auto">
          <Button
            variant="ghost"
            onClick={handleBack}
            className="mb-6"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="w-5 h-5" />
                Profile Settings
              </CardTitle>
              <CardDescription>
                View and update your account information
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Account Type Badge */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Account Type:</span>
                <Badge variant={profile?.account_type === 'hr' ? 'default' : 'secondary'}>
                  {profile?.account_type === 'hr' ? (
                    <>
                      <Building2 className="w-3 h-3 mr-1" />
                      HR / Employer
                    </>
                  ) : (
                    <>
                      <User className="w-3 h-3 mr-1" />
                      Candidate
                    </>
                  )}
                </Badge>
              </div>

              {/* Plan Type */}
              <div className="flex items-center gap-3">
                <span className="text-sm font-medium text-muted-foreground">Current Plan:</span>
                <Badge variant="outline" className="capitalize">
                  {profile?.plan_type || 'free'}
                </Badge>
                {profile?.account_type === 'hr' && (
                  <Button variant="link" size="sm" onClick={() => navigate("/settings/subscription")}>
                    Manage Subscription
                  </Button>
                )}
              </div>

              {/* Email (read-only) */}
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Mail className="w-4 h-4" />
                  Email
                </Label>
                <Input
                  value={profile?.email || ""}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  Email cannot be changed
                </p>
              </div>

              {/* Company Name (HR only) */}
              {profile?.account_type === 'hr' && (
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Building2 className="w-4 h-4" />
                    Company Name
                  </Label>
                  <Input
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="Your Company"
                  />
                </div>
              )}

              {/* Member Since */}
              <div className="pt-4 border-t">
                <p className="text-sm text-muted-foreground">
                  Member since: {profile?.created_at ? new Date(profile.created_at).toLocaleDateString() : 'N/A'}
                </p>
              </div>

              {/* Save Button (HR only) */}
              {profile?.account_type === 'hr' && (
                <Button
                  onClick={handleSave}
                  disabled={saving}
                  className="w-full"
                >
                  {saving ? (
                    "Saving..."
                  ) : (
                    <>
                      <Save className="w-4 h-4 mr-2" />
                      Save Changes
                    </>
                  )}
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
