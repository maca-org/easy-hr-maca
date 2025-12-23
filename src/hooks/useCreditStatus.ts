import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CreditStatus {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  planType: string;
  loading: boolean;
  isAtLimit: boolean;
}

interface UseCreditStatusOptions {
  onLimitReached?: () => void;
}

export function useCreditStatus(options?: UseCreditStatusOptions) {
  const [status, setStatus] = useState<CreditStatus>({
    used: 0,
    limit: 25,
    remaining: 25,
    planType: "free",
    loading: true,
    isAtLimit: false,
  });

  const hasTriggeredLimitCallback = useRef(false);

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

      const isUnlimited = data?.limit === 'unlimited';
      const isAtLimit = !isUnlimited && (data?.remaining ?? 25) <= 0;

      setStatus({
        used: data?.used ?? 0,
        limit: data?.limit ?? 25,
        remaining: data?.remaining ?? 25,
        planType: data?.plan_type ?? "free",
        loading: false,
        isAtLimit,
      });

      // Trigger callback only once when limit is first reached
      if (isAtLimit && !hasTriggeredLimitCallback.current && options?.onLimitReached) {
        hasTriggeredLimitCallback.current = true;
        options.onLimitReached();
      }

      // Reset the flag if user is no longer at limit (e.g., after upgrade)
      if (!isAtLimit) {
        hasTriggeredLimitCallback.current = false;
      }
    } catch (error) {
      console.error("Error checking credits:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, [options]);

  useEffect(() => {
    checkCredits();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        hasTriggeredLimitCallback.current = false;
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
