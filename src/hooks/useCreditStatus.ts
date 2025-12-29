import { useState, useEffect, useCallback, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";

interface CreditStatus {
  used: number;
  limit: number | 'unlimited';
  remaining: number | 'unlimited';
  planType: string;
  loading: boolean;
  isAtLimit: boolean;
  isNearLimit: boolean;
}

interface UseCreditStatusOptions {
  onLimitReached?: () => void;
  onNearLimit?: () => void;
}

export function useCreditStatus(options?: UseCreditStatusOptions) {
  const [status, setStatus] = useState<CreditStatus>({
    used: 0,
    limit: 25,
    remaining: 25,
    planType: "free",
    loading: true,
    isAtLimit: false,
    isNearLimit: false,
  });

  const hasTriggeredLimitCallback = useRef(false);
  const hasTriggeredNearLimitCallback = useRef(false);

  const checkCredits = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-unlock-limit', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) {
        console.error("Error checking credits:", error);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const isUnlimited = data?.limit === 'unlimited';
      const usedCount = data?.used ?? 0;
      const limitCount = data?.limit ?? 25;
      const remainingCount = data?.remaining ?? 25;
      const percentage = isUnlimited ? 0 : (usedCount / limitCount) * 100;
      const isAtLimit = !isUnlimited && remainingCount <= 0;
      const isNearLimit = !isUnlimited && percentage >= 90 && !isAtLimit;

      setStatus({
        used: usedCount,
        limit: limitCount,
        remaining: remainingCount,
        planType: data?.plan_type ?? "free",
        loading: false,
        isAtLimit,
        isNearLimit,
      });

      // Trigger callback only once when limit is first reached
      if (isAtLimit && !hasTriggeredLimitCallback.current && options?.onLimitReached) {
        hasTriggeredLimitCallback.current = true;
        options.onLimitReached();
      }

      // Trigger near limit callback once
      if (isNearLimit && !hasTriggeredNearLimitCallback.current && options?.onNearLimit) {
        hasTriggeredNearLimitCallback.current = true;
        options.onNearLimit();
      }

      // Reset flags if user is no longer at/near limit
      if (!isAtLimit) hasTriggeredLimitCallback.current = false;
      if (!isNearLimit) hasTriggeredNearLimitCallback.current = false;
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
