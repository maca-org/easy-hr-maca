import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SubscriptionStatus {
  subscribed: boolean;
  planType: string;
  subscriptionEnd: string | null;
  loading: boolean;
}

export function useSubscription() {
  const [status, setStatus] = useState<SubscriptionStatus>({
    subscribed: false,
    planType: "free",
    subscriptionEnd: null,
    loading: true,
  });

  const checkSubscription = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      const { data, error } = await supabase.functions.invoke('check-subscription');

      if (error) {
        console.error("Error checking subscription:", error);
        setStatus(prev => ({ ...prev, loading: false }));
        return;
      }

      setStatus({
        subscribed: data?.subscribed ?? false,
        planType: data?.plan_type ?? "free",
        subscriptionEnd: data?.subscription_end ?? null,
        loading: false,
      });
    } catch (error) {
      console.error("Error checking subscription:", error);
      setStatus(prev => ({ ...prev, loading: false }));
    }
  }, []);

  useEffect(() => {
    checkSubscription();

    // Check subscription on auth state change
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'SIGNED_IN') {
        checkSubscription();
      }
    });

    // Check for payment success in URL with retry mechanism
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // Retry mechanism: check subscription multiple times with delays
      const checkWithRetry = async (attempts = 0) => {
        await checkSubscription();
        // After first check, verify if subscription is now active
        const { data } = await supabase.functions.invoke('check-subscription');
        if (!data?.subscribed && attempts < 5) {
          // Not subscribed yet, retry after 3 seconds
          setTimeout(() => checkWithRetry(attempts + 1), 3000);
        }
      };
      // Initial delay to allow Stripe webhook to process
      setTimeout(() => checkWithRetry(), 2000);
      
      // Clean up URL
      window.history.replaceState({}, '', window.location.pathname);
    }

    return () => subscription.unsubscribe();
  }, [checkSubscription]);

  return {
    ...status,
    refreshSubscription: checkSubscription,
  };
}
