import { Sparkles, Crown } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LogOut, User, Settings } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useSubscription } from "@/hooks/useSubscription";
import { CreditProgressBar } from "@/components/CreditProgressBar";
import { format } from "date-fns";
import type { User as SupabaseUser } from "@supabase/supabase-js";
export const Header = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [companyName, setCompanyName] = useState<string | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
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
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <div className="flex flex-col">
            <h1 className="text-xl font-bold text-foreground">Candidate Assess
            </h1>
            {companyName && <span className="text-sm text-muted-foreground">{companyName}</span>}
          </div>
        </div>
        
        <nav className="flex items-center gap-6">
          <button onClick={() => navigate("/")} className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Home
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Pricing
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
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
                <DropdownMenuItem className="cursor-pointer" onClick={() => navigate("/settings/subscription")}>
                  <Settings className="mr-2 h-4 w-4" />
                  <span>Subscription Settings</span>
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
    </header>;
};