import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

interface UnlockStatus {
  planType: string;
  limit: number | 'unlimited';
  used: number;
  remaining: number | 'unlimited';
  canUnlock: boolean;
  billingPeriodStart: string | null;
}

export function useUnlockSystem(userId: string | null) {
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatus>({
    planType: 'free',
    limit: 0,
    used: 0,
    remaining: 0,
    canUnlock: false,
    billingPeriodStart: null
  });
  const [loading, setLoading] = useState(true);
  const [unlockingIds, setUnlockingIds] = useState<Set<string>>(new Set());

  // Fetch unlock status from edge function
  const fetchUnlockStatus = useCallback(async () => {
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
        console.error('Error checking unlock limit:', error);
        return;
      }

      setUnlockStatus({
        planType: data.plan_type || 'free',
        limit: data.limit === 'unlimited' ? 'unlimited' : (data.limit || 0),
        used: data.used || 0,
        remaining: data.remaining === 'unlimited' ? 'unlimited' : (data.remaining || 0),
        canUnlock: data.can_unlock || false,
        billingPeriodStart: data.billing_period_start || null
      });
    } catch (error) {
      console.error('Error fetching unlock status:', error);
    } finally {
      setLoading(false);
    }
  }, [userId]);

  useEffect(() => {
    fetchUnlockStatus();
  }, [fetchUnlockStatus]);

  // Unlock a single candidate
  const unlockCandidate = useCallback(async (candidateId: string): Promise<boolean> => {
    if (!userId) {
      toast.error('Please log in to unlock candidates');
      return false;
    }

    // Check if already unlocking
    if (unlockingIds.has(candidateId)) {
      return false;
    }

    setUnlockingIds(prev => new Set(prev).add(candidateId));

    try {
      const { data: session } = await supabase.auth.getSession();
      if (!session?.session?.access_token) {
        toast.error('Session expired. Please log in again.');
        return false;
      }

      const { data, error } = await supabase.functions.invoke('unlock-candidate', {
        body: { candidate_id: candidateId },
        headers: {
          Authorization: `Bearer ${session.session.access_token}`
        }
      });

      if (error) {
        console.error('Error unlocking candidate:', error);
        toast.error('Failed to unlock candidate');
        return false;
      }

      if (data.limit_reached) {
        toast.error(`Monthly limit reached. Upgrade to unlock more candidates.`);
        return false;
      }

      if (data.success) {
        // Update local status
        setUnlockStatus(prev => ({
          ...prev,
          used: data.used,
          remaining: data.remaining === 'unlimited' ? 'unlimited' : data.remaining,
          canUnlock: data.remaining === 'unlimited' || data.remaining > 0
        }));

        if (!data.already_unlocked) {
          toast.success(data.message || 'Candidate unlocked!');
        }
        return true;
      }

      return false;
    } catch (error) {
      console.error('Error unlocking candidate:', error);
      toast.error('Failed to unlock candidate');
      return false;
    } finally {
      setUnlockingIds(prev => {
        const next = new Set(prev);
        next.delete(candidateId);
        return next;
      });
    }
  }, [userId, unlockingIds]);

  return {
    unlockStatus,
    loading,
    unlockingIds,
    unlockCandidate,
    refreshStatus: fetchUnlockStatus
  };
}
