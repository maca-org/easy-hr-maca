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

// Shared cache across all hook instances
let sharedCreditCache: CreditStatus | null = null;
let sharedCacheTimestamp: number = 0;
let sharedFetchPromise: Promise<void> | null = null;
const CACHE_DURATION_MS = 30000; // 30 seconds cache

export function useCreditStatus(options?: UseCreditStatusOptions) {
  const [status, setStatus] = useState<CreditStatus>(
    sharedCreditCache || {
      used: 0,
      limit: 25,
      remaining: 25,
      planType: "free",
      loading: true,
      isAtLimit: false,
      isNearLimit: false,
    }
  );

  const hasTriggeredLimitCallback = useRef(false);
  const hasTriggeredNearLimitCallback = useRef(false);
  const isMounted = useRef(true);

  const checkCredits = useCallback(async (forceRefresh: boolean = false) => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && sharedCreditCache && Date.now() - sharedCacheTimestamp < CACHE_DURATION_MS) {
      if (isMounted.current) {
        setStatus(sharedCreditCache);
      }
      return;
    }

    // If there's already a fetch in progress, wait for it
    if (sharedFetchPromise && !forceRefresh) {
      await sharedFetchPromise;
      if (sharedCreditCache && isMounted.current) {
        setStatus(sharedCreditCache);
      }
      return;
    }

    sharedFetchPromise = (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          const defaultStatus = {
            ...status,
            loading: false,
          };
          sharedCreditCache = defaultStatus;
          sharedCacheTimestamp = Date.now();
          if (isMounted.current) {
            setStatus(defaultStatus);
          }
          return;
        }

        const { data, error } = await supabase.functions.invoke('check-unlock-limit', {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (error) {
          console.error("Error checking credits:", error);
          if (isMounted.current) {
            setStatus(prev => ({ ...prev, loading: false }));
          }
          return;
        }

        const isUnlimited = data?.limit === 'unlimited';
        const usedCount = data?.used ?? 0;
        const limitCount = data?.limit ?? 25;
        const remainingCount = data?.remaining ?? 25;
        const percentage = isUnlimited ? 0 : (usedCount / limitCount) * 100;
        const isAtLimit = !isUnlimited && remainingCount <= 0;
        const isNearLimit = !isUnlimited && percentage >= 90 && !isAtLimit;

        const newStatus: CreditStatus = {
          used: usedCount,
          limit: limitCount,
          remaining: remainingCount,
          planType: data?.plan_type ?? "free",
          loading: false,
          isAtLimit,
          isNearLimit,
        };

        // Update shared cache
        sharedCreditCache = newStatus;
        sharedCacheTimestamp = Date.now();

        if (isMounted.current) {
          setStatus(newStatus);
        }
      } catch (error) {
        console.error("Error checking credits:", error);
        if (isMounted.current) {
          setStatus(prev => ({ ...prev, loading: false }));
        }
      } finally {
        sharedFetchPromise = null;
      }
    })();

    await sharedFetchPromise;
  }, []);

  // Handle callbacks based on status changes
  useEffect(() => {
    // Trigger callback only once when limit is first reached
    if (status.isAtLimit && !hasTriggeredLimitCallback.current && options?.onLimitReached) {
      hasTriggeredLimitCallback.current = true;
      options.onLimitReached();
    }

    // Trigger near limit callback once
    if (status.isNearLimit && !hasTriggeredNearLimitCallback.current && options?.onNearLimit) {
      hasTriggeredNearLimitCallback.current = true;
      options.onNearLimit();
    }

    // Reset flags if user is no longer at/near limit
    if (!status.isAtLimit) hasTriggeredLimitCallback.current = false;
    if (!status.isNearLimit) hasTriggeredNearLimitCallback.current = false;
  }, [status.isAtLimit, status.isNearLimit, options]);

  useEffect(() => {
    isMounted.current = true;
    checkCredits();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        hasTriggeredLimitCallback.current = false;
        hasTriggeredNearLimitCallback.current = false;
        // Clear cache on sign in
        sharedCreditCache = null;
        sharedCacheTimestamp = 0;
        checkCredits(true);
      } else if (event === 'SIGNED_OUT') {
        // Clear cache on sign out
        sharedCreditCache = null;
        sharedCacheTimestamp = 0;
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [checkCredits]);

  const percentage = status.limit === 'unlimited' 
    ? 0 
    : Math.min(100, (status.used / (status.limit as number)) * 100);

  return {
    ...status,
    percentage,
    refreshCredits: () => checkCredits(true),
  };
}

// Export function to clear cache (useful after payment success)
export function clearCreditStatusCache() {
  sharedCreditCache = null;
  sharedCacheTimestamp = 0;
}
