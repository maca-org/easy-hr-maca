import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface CreditSystemStatus {
  planType: string;
  limit: number | 'unlimited';
  used: number;
  remaining: number | 'unlimited';
  canAnalyze: boolean;
  isAtLimit: boolean;
  billingPeriodStart: string | null;
  loading: boolean;
}

interface UseCreditSystemOptions {
  onLimitReached?: () => void;
}

// Cache to prevent multiple simultaneous calls
let creditCache: CreditSystemStatus | null = null;
let cacheTimestamp: number = 0;
let fetchPromise: Promise<CreditSystemStatus | null> | null = null;
const CACHE_DURATION_MS = 30000; // 30 seconds cache

export function useCreditSystem(userId: string | null, options?: UseCreditSystemOptions) {
  const [status, setStatus] = useState<CreditSystemStatus>({
    planType: 'free',
    limit: 25,
    used: 0,
    remaining: 25,
    canAnalyze: true,
    isAtLimit: false,
    billingPeriodStart: null,
    loading: true,
  });

  const hasTriggeredLimitCallback = useRef(false);
  const isMounted = useRef(true);

  const fetchCreditStatus = useCallback(async (forceRefresh: boolean = false): Promise<CreditSystemStatus | null> => {
    // Check cache first (unless force refresh)
    if (!forceRefresh && creditCache && Date.now() - cacheTimestamp < CACHE_DURATION_MS) {
      setStatus(creditCache);
      return creditCache;
    }

    // If there's already a fetch in progress, wait for it
    if (fetchPromise && !forceRefresh) {
      return fetchPromise;
    }

    if (!userId) {
      const defaultStatus: CreditSystemStatus = {
        ...status,
        loading: false,
      };
      setStatus(defaultStatus);
      return defaultStatus;
    }

    fetchPromise = (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          return null;
        }

        const { data, error } = await supabase.functions.invoke('check-unlock-limit', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`,
          },
        });

        if (error) {
          console.error('Error checking credits:', error);
          return null;
        }

        const isUnlimited = data?.limit === 'unlimited';
        const remainingValue = isUnlimited ? 'unlimited' : (data?.remaining ?? 25);
        const isAtLimit = !isUnlimited && remainingValue <= 0;

        const newStatus: CreditSystemStatus = {
          planType: data?.plan_type ?? 'free',
          limit: data?.limit ?? 25,
          used: data?.used ?? 0,
          remaining: remainingValue,
          canAnalyze: data?.can_unlock ?? true,
          isAtLimit,
          billingPeriodStart: data?.billing_period_start || null,
          loading: false,
        };

        // Update cache
        creditCache = newStatus;
        cacheTimestamp = Date.now();

        if (isMounted.current) {
          setStatus(newStatus);
        }

        return newStatus;
      } catch (error) {
        console.error('Error fetching credits:', error);
        return null;
      } finally {
        fetchPromise = null;
      }
    })();

    return fetchPromise;
  }, [userId]);

  // Initial fetch and auth state listener
  useEffect(() => {
    isMounted.current = true;

    // Check if user is authenticated before fetching
    const initFetch = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      // Only fetch if no cache or cache is stale
      if (!creditCache || Date.now() - cacheTimestamp >= CACHE_DURATION_MS) {
        fetchCreditStatus();
      } else {
        setStatus(creditCache);
      }
    };

    initFetch();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        hasTriggeredLimitCallback.current = false;
        // Clear cache on sign in
        creditCache = null;
        cacheTimestamp = 0;
        fetchCreditStatus(true);
      } else if (event === 'SIGNED_OUT') {
        // Clear cache on sign out
        creditCache = null;
        cacheTimestamp = 0;
      }
    });

    return () => {
      isMounted.current = false;
      subscription.unsubscribe();
    };
  }, [fetchCreditStatus]);

  // Handle limit reached callback
  useEffect(() => {
    if (status.isAtLimit && !hasTriggeredLimitCallback.current && options?.onLimitReached) {
      hasTriggeredLimitCallback.current = true;
      options.onLimitReached();
    }

    if (!status.isAtLimit) {
      hasTriggeredLimitCallback.current = false;
    }
  }, [status.isAtLimit, options]);

  // Use one credit for CV analysis
  const useCredit = useCallback(async (): Promise<{ canAnalyze: boolean; remaining: number | 'unlimited' }> => {
    if (!userId) {
      return { canAnalyze: false, remaining: 0 };
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        return { canAnalyze: false, remaining: 0 };
      }

      const { data, error } = await supabase.functions.invoke('use-analysis-credit', {
        headers: {
          Authorization: `Bearer ${session.session.access_token}`,
        },
      });

      if (error) {
        console.error('Error using analysis credit:', error);
        return { canAnalyze: false, remaining: 0 };
      }

      const isUnlimited = data.remaining === 'unlimited';
      const newStatus: CreditSystemStatus = {
        ...status,
        used: data.used,
        remaining: isUnlimited ? 'unlimited' : data.remaining,
        canAnalyze: data.can_analyze,
        isAtLimit: !isUnlimited && data.remaining <= 0,
      };

      // Update cache and state
      creditCache = newStatus;
      cacheTimestamp = Date.now();
      setStatus(newStatus);

      return {
        canAnalyze: data.can_analyze,
        remaining: isUnlimited ? 'unlimited' : data.remaining,
      };
    } catch (error) {
      console.error('Error using credit:', error);
      return { canAnalyze: false, remaining: 0 };
    }
  }, [userId, status]);

  const refreshCredits = useCallback(() => {
    return fetchCreditStatus(true);
  }, [fetchCreditStatus]);

  const percentage = status.limit === 'unlimited' 
    ? 0 
    : Math.min(100, (status.used / (status.limit as number)) * 100);

  return {
    ...status,
    percentage,
    useCredit,
    refreshCredits,
  };
}

// Export a function to clear cache (useful after payment success)
export function clearCreditCache() {
  creditCache = null;
  cacheTimestamp = 0;
}
