import { Sparkles } from "lucide-react";
import { Button } from "./ui/button";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";
import { LogOut, User } from "lucide-react";
import { toast } from "sonner";
import type { User as SupabaseUser } from "@supabase/supabase-js";

export const Header = () => {
  const navigate = useNavigate();
  const [balance, setBalance] = useState(5.00);
  const [user, setUser] = useState<SupabaseUser | null>(null);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    // Get current user
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, []);

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

  const getBalanceColor = () => {
    if (balance >= 5) return "bg-green-100 text-green-800";
    if (balance < 1) return "bg-red-100 text-red-800";
    return "bg-yellow-100 text-yellow-800";
  };

  return (
    <header className="border-b border-border bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-10 h-10 bg-primary rounded-lg">
            <Sparkles className="w-6 h-6 text-primary-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">
            <span className="text-primary">AI</span> Resume Screening
          </h1>
        </div>
        
        <nav className="flex items-center gap-6">
          <button 
            onClick={() => navigate("/")}
            className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200"
          >
            Home
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Pricing
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Support
          </button>
          <button className="text-foreground flex flex-col items-center hover:after:w-full after:w-0 after:h-0.5 after:bg-foreground/60 after:transition-all after:duration-200">
            Settings
          </button>
          <button 
            className={`px-3 py-1.5 rounded-md text-sm font-medium transition-opacity hover:opacity-80 ${getBalanceColor()}`}
            onClick={() => console.log('Navigate to Settings')}
          >
            ${balance.toFixed(2)}
          </button>
          
          {user && (
            <DropdownMenu>
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
                <DropdownMenuItem
                  className="cursor-pointer"
                  onClick={handleSignOut}
                  disabled={isLoggingOut}
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{isLoggingOut ? "Signing out..." : "Sign Out"}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </nav>
      </div>
    </header>
  );
};
