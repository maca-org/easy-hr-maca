import { useState } from "react";
import { Header } from "@/components/Header";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useSubscription } from "@/hooks/useSubscription";
import { UpgradeModal } from "@/components/UpgradeModal";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Crown, Calendar, Users, ExternalLink, Loader2, Sparkles } from "lucide-react";
import { format } from "date-fns";

const PLAN_DETAILS: Record<string, { name: string; price: number; limit: number; features: string[] }> = {
  free: {
    name: "Free",
    price: 0,
    limit: 10,
    features: ["10 candidates/month", "Basic CV screening", "Email support"],
  },
  starter: {
    name: "Starter",
    price: 29,
    limit: 100,
    features: ["100 candidates/month", "CV analysis & scoring", "Assessment tests", "Email support"],
  },
  pro: {
    name: "Pro",
    price: 79,
    limit: 250,
    features: ["250 candidates/month", "Advanced CV analysis", "Custom assessments", "Priority support", "Analytics dashboard"],
  },
  business: {
    name: "Business",
    price: 199,
    limit: 1000,
    features: ["1000 candidates/month", "Full AI analysis", "Custom branding", "API access", "Dedicated support", "Team collaboration"],
  },
};

export default function SubscriptionSettings() {
  const { subscribed, planType, subscriptionEnd, loading, refreshSubscription } = useSubscription();
  const [isUpgradeModalOpen, setIsUpgradeModalOpen] = useState(false);
  const [isLoadingPortal, setIsLoadingPortal] = useState(false);

  const currentPlan = PLAN_DETAILS[planType] || PLAN_DETAILS.free;

  const handleManageSubscription = async () => {
    setIsLoadingPortal(true);
    try {
      const { data, error } = await supabase.functions.invoke("customer-portal");

      if (error) throw error;

      if (data?.url) {
        window.open(data.url, "_blank");
      } else {
        throw new Error("No portal URL returned");
      }
    } catch (error: any) {
      console.error("Error opening customer portal:", error);
      toast.error("Failed to open subscription management. Please try again.");
    } finally {
      setIsLoadingPortal(false);
    }
  };

  const formatBillingDate = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      return format(new Date(dateString), "MMMM d, yyyy");
    } catch {
      return null;
    }
  };

  const getDaysUntilBilling = (dateString: string | null) => {
    if (!dateString) return null;
    try {
      const endDate = new Date(dateString);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays > 0 ? diffDays : 0;
    } catch {
      return null;
    }
  };

  const billingDate = formatBillingDate(subscriptionEnd);
  const daysUntilBilling = getDaysUntilBilling(subscriptionEnd);

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="container mx-auto px-6 py-8">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-6 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-foreground">Subscription Settings</h1>
          <p className="text-muted-foreground mt-1">Manage your subscription and billing</p>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          {/* Current Plan Card */}
          <Card className="border-primary/20">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-2">
                  <Crown className="h-5 w-5 text-primary" />
                  Current Plan
                </CardTitle>
                {subscribed && (
                  <Badge variant="default" className="bg-green-500/10 text-green-600 border-green-500/20">
                    Active
                  </Badge>
                )}
              </div>
              <CardDescription>Your active subscription details</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold text-foreground">{currentPlan.name}</span>
                  {currentPlan.price > 0 && (
                    <span className="text-muted-foreground">${currentPlan.price}/month</span>
                  )}
                </div>

                <ul className="space-y-2">
                  {currentPlan.features.map((feature, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {subscribed && (
                  <Button
                    onClick={handleManageSubscription}
                    variant="outline"
                    className="w-full mt-4"
                    disabled={isLoadingPortal}
                  >
                    {isLoadingPortal ? (
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <ExternalLink className="h-4 w-4 mr-2" />
                    )}
                    Manage Subscription
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Billing Info Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="h-5 w-5 text-primary" />
                Billing Information
              </CardTitle>
              <CardDescription>Your billing cycle and usage limits</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {subscribed && billingDate ? (
                  <>
                    <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                      <span className="text-sm text-muted-foreground">Next billing date</span>
                      <span className="font-medium text-foreground">{billingDate}</span>
                    </div>
                    {daysUntilBilling !== null && (
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <span className="text-sm text-muted-foreground">Days remaining</span>
                        <span className="font-medium text-foreground">{daysUntilBilling} days</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-3 bg-muted/50 rounded-lg text-center">
                    <span className="text-sm text-muted-foreground">No active subscription</span>
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Monthly limit</span>
                  </div>
                  <span className="font-medium text-foreground">{currentPlan.limit} candidates</span>
                </div>

                <Button
                  onClick={() => setIsUpgradeModalOpen(true)}
                  className="w-full mt-4"
                >
                  <Sparkles className="h-4 w-4 mr-2" />
                  {subscribed ? "Change Plan" : "Upgrade Plan"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <UpgradeModal
          isOpen={isUpgradeModalOpen}
          onClose={() => setIsUpgradeModalOpen(false)}
          currentPlan={planType}
          onSelectPlan={async (planId) => {
            setIsUpgradeModalOpen(false);
            await refreshSubscription();
          }}
        />
      </main>
    </div>
  );
}
