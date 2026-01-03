import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { supabase } from '@/integrations/supabase/client';

interface Profile {
  id: string;
  email: string;
  company_name: string | null;
  account_type: string | null;
  plan_type: string | null;
  created_at: string;
}

export function useEnsureProfile(user: User | null) {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setProfile(null);
      setLoading(false);
      return;
    }

    const ensureProfile = async () => {
      try {
        setLoading(true);
        setError(null);

        // Check if profile exists
        const { data: existingProfile, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .maybeSingle();

        if (fetchError) {
          throw fetchError;
        }

        if (existingProfile) {
          setProfile(existingProfile);
          setLoading(false);
          return;
        }

        // Profile doesn't exist, create it
        const companyName = user.user_metadata?.company_name || null;
        const accountType = companyName ? 'hr' : 'candidate';

        const { data: newProfile, error: insertError } = await supabase
          .from('profiles')
          .insert({
            id: user.id,
            email: user.email || '',
            company_name: companyName,
            account_type: accountType,
            plan_type: 'free'
          })
          .select()
          .single();

        if (insertError) {
          throw insertError;
        }

        setProfile(newProfile);

        // Optionally send welcome email for new profiles
        if (newProfile && accountType === 'hr') {
          try {
            await supabase.functions.invoke('send-welcome-email', {
              body: {
                email: user.email,
                companyName: companyName
              }
            });
          } catch (emailError) {
            console.warn('Failed to send welcome email:', emailError);
          }
        }
      } catch (err) {
        console.error('Error ensuring profile:', err);
        setError(err instanceof Error ? err : new Error('Failed to ensure profile'));
      } finally {
        setLoading(false);
      }
    };

    ensureProfile();
  }, [user?.id]);

  return { profile, loading, error };
}
