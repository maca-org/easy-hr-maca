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

    // Check for payment success in URL
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('payment') === 'success') {
      // Wait a bit for webhook to process, then check
      setTimeout(() => {
        checkSubscription();
      }, 2000);
      
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
