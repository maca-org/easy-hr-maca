import { useState, useEffect, useCallback, useRef } from 'react';
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

// Shared cache across all hook instances
let sharedUnlockCache: UnlockStatus | null = null;
let sharedUnlockCacheTimestamp: number = 0;
let sharedUnlockFetchPromise: Promise<UnlockStatus | null> | null = null;
const CACHE_DURATION_MS = 30000; // 30 seconds cache

export function useUnlockSystem(userId: string | null) {
  const [unlockStatus, setUnlockStatus] = useState<UnlockStatus>(
    sharedUnlockCache || {
      planType: 'free',
      limit: 0,
      used: 0,
      remaining: 0,
      canUnlock: false,
      billingPeriodStart: null
    }
  );
  const [loading, setLoading] = useState(!sharedUnlockCache);
  const [unlockingIds, setUnlockingIds] = useState<Set<string>>(new Set());
  const isMounted = useRef(true);

  // Fetch unlock status from edge function
  const fetchUnlockStatus = useCallback(async (forceRefresh: boolean = false): Promise<UnlockStatus | null> => {
    if (!userId) {
      setLoading(false);
      return null;
    }

    // Check cache first (unless force refresh)
    if (!forceRefresh && sharedUnlockCache && Date.now() - sharedUnlockCacheTimestamp < CACHE_DURATION_MS) {
      if (isMounted.current) {
        setUnlockStatus(sharedUnlockCache);
        setLoading(false);
      }
      return sharedUnlockCache;
    }

    // If there's already a fetch in progress, wait for it
    if (sharedUnlockFetchPromise && !forceRefresh) {
      const result = await sharedUnlockFetchPromise;
      if (result && isMounted.current) {
        setUnlockStatus(result);
        setLoading(false);
      }
      return result;
    }

    sharedUnlockFetchPromise = (async () => {
      try {
        const { data: session } = await supabase.auth.getSession();
        if (!session?.session?.access_token) {
          if (isMounted.current) {
            setLoading(false);
          }
          return null;
        }

        const { data, error } = await supabase.functions.invoke('check-unlock-limit', {
          headers: {
            Authorization: `Bearer ${session.session.access_token}`
          }
        });

        if (error) {
          console.error('Error checking unlock limit:', error);
          return null;
        }

        const newStatus: UnlockStatus = {
          planType: data.plan_type || 'free',
          limit: data.limit === 'unlimited' ? 'unlimited' : (data.limit || 0),
          used: data.used || 0,
          remaining: data.remaining === 'unlimited' ? 'unlimited' : (data.remaining || 0),
          canUnlock: data.can_unlock || false,
          billingPeriodStart: data.billing_period_start || null
        };

        // Update shared cache
        sharedUnlockCache = newStatus;
        sharedUnlockCacheTimestamp = Date.now();

        if (isMounted.current) {
          setUnlockStatus(newStatus);
        }

        return newStatus;
      } catch (error) {
        console.error('Error fetching unlock status:', error);
        return null;
      } finally {
        sharedUnlockFetchPromise = null;
        if (isMounted.current) {
          setLoading(false);
        }
      }
    })();

    return sharedUnlockFetchPromise;
  }, [userId]);

  useEffect(() => {
    isMounted.current = true;
    fetchUnlockStatus();

    return () => {
      isMounted.current = false;
    };
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
        // Update local status and cache
        const newStatus: UnlockStatus = {
          ...unlockStatus,
          used: data.used,
          remaining: data.remaining === 'unlimited' ? 'unlimited' : data.remaining,
          canUnlock: data.remaining === 'unlimited' || data.remaining > 0
        };

        sharedUnlockCache = newStatus;
        sharedUnlockCacheTimestamp = Date.now();
        setUnlockStatus(newStatus);

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
  }, [userId, unlockingIds, unlockStatus]);

  return {
    unlockStatus,
    loading,
    unlockingIds,
    unlockCandidate,
    refreshStatus: () => fetchUnlockStatus(true)
  };
}

// Export function to clear cache
export function clearUnlockCache() {
  sharedUnlockCache = null;
  sharedUnlockCacheTimestamp = 0;
}
