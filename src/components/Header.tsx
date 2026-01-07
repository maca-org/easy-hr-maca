import { Crown, LogOut, Settings, Mail, Clock, User, CreditCard, Briefcase } from "lucide-react";
import logoImage from "@/assets/logo.png";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubscription } from "@/hooks/useSubscription";
import { CreditProgressBar } from "@/components/CreditProgressBar";
import { CreditWarningModal } from "@/components/CreditWarningModal";
import { UpgradeModal } from "@/components/UpgradeModal";
import { useCreditStatus } from "@/hooks/useCreditStatus";
import { format } from "date-fns";
import type { User as SupabaseUser } from "@supabase/supabase-js";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";

const CREDIT_WARNING_KEY = 'credit_warning_shown_session';

export const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [showSupportDialog, setShowSupportDialog] = useState(false);
  const [showCreditWarning, setShowCreditWarning] = useState(false);
  const [showUpgradeModal, setShowUpgradeModal] = useState(false);

  const { used, limit, remaining, planType: creditPlanType, isNearLimit, isAtLimit } = useCreditStatus({
    onNearLimit: () => {
      const hasShown = sessionStorage.getItem(CREDIT_WARNING_KEY);
      if (!hasShown) {
        setShowCreditWarning(true);
        sessionStorage.setItem(CREDIT_WARNING_KEY, 'true');
      }
    },
    onLimitReached: () => {
      const hasShown = sessionStorage.getItem(CREDIT_WARNING_KEY);
      if (!hasShown) {
        setShowCreditWarning(true);
        sessionStorage.setItem(CREDIT_WARNING_KEY, 'true');
      }
    },
  });
  const {
    subscribed,
    planType,
    subscriptionEnd
  } = useSubscription();
  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({
      data: {
        session
      }
    }) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });
    const {
      data: {
        subscription
      }
    } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      if (session?.user) {
        setTimeout(() => {
          fetchProfile(session.user.id);
        }, 0);
      } else {
        setCompanyName(null);
      }
    });
    return () => subscription.unsubscribe();
  }, []);
  const fetchProfile = async (userId: string) => {
    const {
      data
    } = await supabase.from('profiles').select('company_name').eq('id', userId).single();
    if (data) {
      setCompanyName(data.company_name);
    }
  };
  const handleSignOut = async () => {
    setIsLoggingOut(true);
    await supabase.auth.signOut();
    toast.success("Signed out successfully");
    navigate("/");
    setIsLoggingOut(false);
  };
  const getInitials = (email: string) => {
    return email.charAt(0).toUpperCase();
  };
  const getPlanBadgeColor = () => {
    switch (planType) {
      case "business":
        return "bg-purple-500/10 text-purple-600 border-purple-500/20 hover:bg-purple-500/20";
      case "pro":
        return "bg-blue-500/10 text-blue-600 border-blue-500/20 hover:bg-blue-500/20";
      case "starter":
        return "bg-green-500/10 text-green-600 border-green-500/20 hover:bg-green-500/20";
      default:
        return "bg-muted text-muted-foreground border-border hover:bg-muted/80";
    }
  };
  const getPlanDisplayName = () => {
    switch (planType) {
      case "business":
        return "Business";
      case "pro":
        return "Pro";
      case "starter":
        return "Starter";
      default:
        return "Free";
    }
  };
  const formatBillingDate = () => {
    if (!subscriptionEnd) return null;
    try {
      return format(new Date(subscriptionEnd), "MMM d, yyyy");
    } catch {
      return null;
    }
  };
  const billingDate = formatBillingDate();
  return <header className="border-b border-border bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <button onClick={() => navigate("/")} className="flex items-center gap-3 cursor-pointer hover:opacity-80 transition-opacity">
          <img src={logoImage} alt="Candidate Assess Logo" className="w-10 h-10 object-contain" />
          <div className="flex flex-col text-left">
            <h1 className="text-xl font-bold text-foreground">Candidate Assess</h1>
            {companyName && <span className="text-sm text-muted-foreground">{companyName}</span>}
          </div>
        </button>
        
        <nav className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Home
          </button>
          <button onClick={() => navigate("/jobs")} className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Dashboard
          </button>
          <button onClick={() => setShowSupportDialog(true)} className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Support
          </button>
          <button onClick={() => navigate("/settings/subscription")} className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Settings
          </button>
          
          {user && (
            <Tooltip>
              <TooltipTrigger asChild>
                <div className="cursor-pointer" onClick={() => navigate("/settings/subscription")}>
                  <CreditProgressBar compact />
                </div>
              </TooltipTrigger>
              <TooltipContent>
                <p className="text-xs">Click to manage subscription</p>
              </TooltipContent>
            </Tooltip>
          )}

          {user && <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant="outline" className={`cursor-pointer flex items-center gap-1.5 px-2.5 py-1 ${getPlanBadgeColor()}`} onClick={() => navigate("/settings/subscription")}>
                  <Crown className="h-3.5 w-3.5" />
                  {getPlanDisplayName()}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p className="font-medium">{getPlanDisplayName()} Plan</p>
                {subscribed && billingDate && <p className="text-xs text-muted-foreground">Renews {billingDate}</p>}
              </TooltipContent>
            </Tooltip>}
          
          {user && <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-9 w-9 rounded-full p-0">
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className="bg-teal-600 text-white font-semibold">
                      {getInitials(user.email || "")}
                    </AvatarFallback>
                  </Avatar>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-64 bg-background" align="end" forceMount>
                <div className="flex flex-col space-y-1 p-2">
                  <p className="text-xs text-muted-foreground">Signed in as</p>
                  <p className="text-sm font-medium truncate">{user.email}</p>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/jobs")}>
                  <Briefcase className="mr-2 h-4 w-4" />
                  <span>Dashboard</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings/subscription")}>
                  <CreditCard className="mr-2 h-4 w-4" />
                  <span>Subscription Settings</span>
                </DropdownMenuItem>
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings/profile")}>
                  <User className="mr-2 h-4 w-4" />
                  <span>Profile Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem className="cursor-pointer" onClick={handleSignOut} disabled={isLoggingOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
        </nav>
      </div>

      {/* Support Contact Dialog */}
      <Dialog open={showSupportDialog} onOpenChange={setShowSupportDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Contact Support</DialogTitle>
            <DialogDescription>
              Get in touch with our support team
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Mail className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <a 
                  href="mailto:candidateassess@gmail.com" 
                  className="text-foreground font-medium hover:text-primary transition-colors"
                >
                  candidateassess@gmail.com
                </a>
              </div>
            </div>
            
            <div className="flex items-center gap-3 p-3 rounded-lg bg-muted/50">
              <Clock className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Response Time</p>
                <p className="text-foreground font-medium">Within 24 hours</p>
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Credit Warning Modal */}
      <CreditWarningModal
        isOpen={showCreditWarning}
        onClose={() => setShowCreditWarning(false)}
        used={typeof used === 'number' ? used : 0}
        limit={typeof limit === 'number' ? limit : 25}
        remaining={typeof remaining === 'number' ? remaining : 25}
        planType={creditPlanType}
        onUpgrade={() => {
          setShowCreditWarning(false);
          setShowUpgradeModal(true);
        }}
      />

      {/* Upgrade Modal */}
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={creditPlanType}
        onSelectPlan={() => setShowUpgradeModal(false)}
      />
    </header>;
};