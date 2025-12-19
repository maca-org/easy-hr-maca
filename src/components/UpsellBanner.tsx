import { Lock, Sparkles, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

interface UpsellBannerProps {
  totalCandidates: number;
  unlockedCount: number;
  planType: string;
  monthlyLimit: number | 'unlimited';
  usedThisMonth: number;
  onUpgrade: () => void;
}

export function UpsellBanner({
  totalCandidates,
  unlockedCount,
  planType,
  monthlyLimit,
  usedThisMonth,
  onUpgrade
}: UpsellBannerProps) {
  const lockedCount = totalCandidates - unlockedCount;
  const isFreeUser = planType === 'free';
  const remaining = monthlyLimit === 'unlimited' ? 'unlimited' : Math.max(0, monthlyLimit - usedThisMonth);
  const isLimitReached = monthlyLimit !== 'unlimited' && usedThisMonth >= monthlyLimit;

  // Don't show if no locked candidates or user has unlimited plan with remaining unlocks
  if (lockedCount === 0) return null;
  if (planType === 'enterprise') return null;

  // Plan pricing info
  const plans = [
    { name: 'Starter', price: 29, limit: 100, highlight: planType === 'free' },
    { name: 'Pro', price: 79, limit: 250, highlight: planType === 'starter' },
    { name: 'Business', price: 199, limit: 1000, highlight: planType === 'pro' },
  ];

  const nextPlan = plans.find(p => p.highlight) || plans[0];

  return (
    <Card className="bg-gradient-to-r from-purple-600 via-blue-600 to-indigo-600 text-white border-0 shadow-lg overflow-hidden">
      <CardContent className="p-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Left side - Message */}
          <div className="flex items-center gap-4">
            <div className="p-3 bg-white/20 rounded-full">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h3 className="text-xl font-bold flex items-center gap-2">
                <Sparkles className="h-5 w-5" />
                {lockedCount} candidate{lockedCount > 1 ? 's' : ''} applied!
              </h3>
              <p className="text-white/80 mt-1">
                {isFreeUser 
                  ? "Unlock to see who you should hire. Get candidate names, scores, and AI insights."
                  : isLimitReached
                    ? `You've used all ${monthlyLimit} unlocks this month. Upgrade to unlock more candidates.`
                    : `You have ${remaining} unlock${remaining !== 1 ? 's' : ''} remaining this month.`
                }
              </p>
            </div>
          </div>

          {/* Right side - CTA */}
          <div className="flex flex-col sm:flex-row items-center gap-3">
            {isFreeUser || isLimitReached ? (
              <Button 
                onClick={onUpgrade}
                size="lg"
                className="bg-white text-purple-600 hover:bg-white/90 font-semibold shadow-md"
              >
                Upgrade to {nextPlan.name} - ${nextPlan.price}/mo
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <div className="text-center">
                <div className="text-2xl font-bold">{remaining}</div>
                <div className="text-xs text-white/70">unlocks left</div>
              </div>
            )}
          </div>
        </div>

        {/* Plan comparison - show for free users */}
        {isFreeUser && (
          <div className="mt-6 pt-4 border-t border-white/20">
            <div className="grid grid-cols-3 gap-4 text-center text-sm">
              {plans.map((plan) => (
                <div key={plan.name} className="bg-white/10 rounded-lg p-3">
                  <div className="font-semibold">{plan.name}</div>
                  <div className="text-2xl font-bold">${plan.price}</div>
                  <div className="text-xs text-white/70">{plan.limit} candidates/mo</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
