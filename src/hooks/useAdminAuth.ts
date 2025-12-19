import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface AdminAuthState {
  isAdmin: boolean;
  loading: boolean;
}

export function useAdminAuth() {
  const [state, setState] = useState<AdminAuthState>({
    isAdmin: false,
    loading: true,
  });

  const checkAdminStatus = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setState({ isAdmin: false, loading: false });
        return;
      }

      // Use the has_role function via RPC
      const { data, error } = await supabase.rpc('has_role', {
        _user_id: session.user.id,
        _role: 'admin'
      });

      if (error) {
        console.error("Error checking admin status:", error);
        setState({ isAdmin: false, loading: false });
        return;
      }

      setState({ isAdmin: data === true, loading: false });
    } catch (error) {
      console.error("Error checking admin status:", error);
      setState({ isAdmin: false, loading: false });
    }
  }, []);

  useEffect(() => {
    checkAdminStatus();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(() => {
      checkAdminStatus();
    });

    return () => subscription.unsubscribe();
  }, [checkAdminStatus]);

  return {
    ...state,
    refreshAdminStatus: checkAdminStatus,
  };
}
