import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisCreditStatus {
  planType: string;
  limit: number | 'unlimited';
  used: number;
  remaining: number | 'unlimited';
  canAnalyze: boolean;
  billingPeriodStart: string | null;
}

// Shared cache across all hook instances
let sharedAnalysisCache: AnalysisCreditStatus | null = null;
let sharedAnalysisCacheTimestamp: number = 0;
let sharedAnalysisFetchPromise: Promise<void> | null = null;
const CACHE_DURATION_MS = 30000; // 30 seconds cache

export function useAnalysisCredits(userId: string | null) {
  const [creditStatus, setCreditStatus] = useState<AnalysisCreditStatus>(
    sharedAnalysisCache || {
      planType: 'free',
      limit: 25,
      used: 0,
      remaining: 25,
      canAnalyze: true,
      billingPeriodStart: null
    }
  );
  const [loading, setLoading] = useState(!sharedAnalysisCache);
  const isMounted = useRef(true);

  // Fetch credit status from edge function
  const fetchCreditStatus = useCallback(async (forceRefresh: boolean = false) => {
    if (!userId) {
      setLoading(false);
      return;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && sharedAnalysisCache && Date.now() - sharedAnalysisCacheTimestamp < CACHE_DURATION_MS) {
      if (isMounted.current) {
        setCreditStatus(sharedAnalysisCache);
        setLoading(false);
      }
      return;
    }

    // If there's already a fetch in progress, wait for it
    if (sharedAnalysisFetchPromise && !forceRefresh) {
      await sharedAnalysisFetchPromise;
      if (sharedAnalysisCache && isMounted.current) {
        setCreditStatus(sharedAnalysisCache);
        setLoading(false);
      }
      return;
    }

    sharedAnalysisFetchPromise = (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          if (isMounted.current) {
            setLoading(false);
          }
          return;
        }

        const { data, error } = await supabase.functions.invoke('check-unlock-limit', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`
          }
        });

        if (error) {
          console.error('Error checking analysis credits:', error);
          return;
        }

        const newStatus: AnalysisCreditStatus = {
          planType: data.plan_type || 'free',
          limit: data.limit === 'unlimited' ? 'unlimited' : (data.limit || 25),
          used: data.used || 0,
          remaining: data.remaining === 'unlimited' ? 'unlimited' : (data.remaining || 0),
          canAnalyze: data.can_unlock || false,
          billingPeriodStart: data.billing_period_start || null
        };

        // Update shared cache
        sharedAnalysisCache = newStatus;
        sharedAnalysisCacheTimestamp = Date.now();

        if (isMounted.current) {
          setCreditStatus(newStatus);
        }
      } catch (error) {
        console.error('Error fetching credit status:', error);
      } finally {
        sharedAnalysisFetchPromise = null;
        if (isMounted.current) {
          setLoading(false);
        }
      }
    })();

    await sharedAnalysisFetchPromise;
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    fetchCreditStatus();

    return () => {
      isMounted.current = false;
    };
  }, [fetchCreditStatus]);

  // Use one credit for CV analysis - called before analyze-cv
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
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) {
        console.error('Error using analysis credit:', error);
        return { canAnalyze: false, remaining: 0 };
      }

      const newStatus: AnalysisCreditStatus = {
        ...creditStatus,
        used: data.used,
        remaining: data.remaining === 'unlimited' ? 'unlimited' : data.remaining,
        canAnalyze: data.can_analyze
      };

      // Update shared cache
      sharedAnalysisCache = newStatus;
      sharedAnalysisCacheTimestamp = Date.now();

      setCreditStatus(newStatus);

      return {
        canAnalyze: data.can_analyze,
        remaining: data.remaining === 'unlimited' ? 'unlimited' : data.remaining
      };
    } catch (error) {
      console.error('Error using credit:', error);
      return { canAnalyze: false, remaining: 0 };
    }
  }, [userId, creditStatus]);

  return {
    creditStatus,
    loading,
    useCredit,
    refreshCredits: () => fetchCreditStatus(true)
  };
}

// Export function to clear cache
export function clearAnalysisCreditCache() {
  sharedAnalysisCache = null;
  sharedAnalysisCacheTimestamp = 0;
}
