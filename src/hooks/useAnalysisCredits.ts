import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

interface AnalysisCreditStatus {
  planType: string;
  limit: number | 'unlimited';
  used: number;
  remaining: number | 'unlimited';
  canAnalyze: boolean;
  billingPeriodStart: string | null;
}

export function useAnalysisCredits(userId: string | null) {
  const [creditStatus, setCreditStatus] = useState<AnalysisCreditStatus>({
    planType: 'free',
    limit: 25,
    used: 0,
    remaining: 25,
    canAnalyze: true,
    billingPeriodStart: null
  });
  const [loading, setLoading] = useState(true);

  // Fetch credit status from edge function
  const fetchCreditStatus = useCallback(async () => {
    if (!userId) {
      setLoading(false);
      return;
    }

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        setLoading(false);
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

      setCreditStatus({
        planType: data.plan_type || 'free',
        limit: data.limit === 'unlimited' ? 'unlimited' : (data.limit || 25),
        used: data.used || 0,
        remaining: data.remaining === 'unlimited' ? 'unlimited' : (data.remaining || 0),
        canAnalyze: data.can_unlock || false,
        billingPeriodStart: data.billing_period_start || null
      });
    } catch (error) {
      console.error('Error fetching credit status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchCreditStatus();
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

      // Update local state with new values
      setCreditStatus(prev => ({
        ...prev,
        used: data.used,
        remaining: data.remaining === 'unlimited' ? 'unlimited' : data.remaining,
        canAnalyze: data.can_analyze
      }));

      return {
        canAnalyze: data.can_analyze,
        remaining: data.remaining === 'unlimited' ? 'unlimited' : data.remaining
      };
    } catch (error) {
      console.error('Error using credit:', error);
      return { canAnalyze: false, remaining: 0 };
    }
  }, [userId]);

  return {
    creditStatus,
    loading,
    useCredit,
    refreshCredits: fetchCreditStatus
  };
}
