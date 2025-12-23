import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CreditStatus {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  planType: string;
  loading: boolean;
}

export function useCreditStatus() {
  const [status, setStatus] = useState<CreditStatus>({
    used: 0,
    limit: 25,
    remaining: 25,
    planType: "free",
    loading: true,
  });

  const checkCredits = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-unlock-limit');

      if (error) {
        console.error("Error checking credits:", error);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      setStatus({
        used: data?.used ?? 0,
        limit: data?.limit ?? 25,
        remaining: data?.remaining ?? 25,
        planType: data?.plan_type ?? "free",
        loading: false,
      });
    } catch (error) {
      console.error("Error checking credits:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkCredits();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkCredits();
      }
    });

    return () => subscription.unsubscribe();
  }, [checkCredits]);

  const percentage = status.limit === 'unlimited' 
    ? 0 
    : Math.min(100, (status.used / (status.limit as number)) * 100);

  return {
    ...status,
    percentage,
    refreshCredits: checkCredits,
  };
}
