import { Check, Sparkles, X } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

interface UpgradeModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentPlan: string;
  onSelectPlan: (plan: string) => void;
}

const plans = [
  {
    id: 'starter',
    name: 'Starter',
    price: 29,
    limit: 100,
    features: [
      'Unlock up to 100 candidates/month',
      'View candidate names & contacts',
      'CV match scores',
      'Assessment results',
      'Email support'
    ]
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 79,
    limit: 250,
    popular: true,
    features: [
      'Unlock up to 250 candidates/month',
      'Everything in Starter',
      'AI-powered rankings',
      'Detailed insights',
      'Priority support'
    ]
  },
  {
    id: 'business',
    name: 'Business',
    price: 199,
    limit: 1000,
    features: [
      'Unlock up to 1,000 candidates/month',
      'Everything in Pro',
      'Team collaboration',
      'Advanced analytics',
      'Dedicated support'
    ]
  }
];

export function UpgradeModal({ isOpen, onClose, currentPlan, onSelectPlan }: UpgradeModalProps) {
  const currentPlanIndex = plans.findIndex(p => p.id === currentPlan);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <DialogTitle className="text-2xl font-bold text-center flex items-center justify-center gap-2">
            <Sparkles className="h-6 w-6 text-purple-500" />
            Upgrade Your Plan
          </DialogTitle>
        </DialogHeader>

        <div className="grid md:grid-cols-3 gap-4 mt-6">
          {plans.map((plan, index) => {
            const isCurrentPlan = plan.id === currentPlan;
            const isDowngrade = index < currentPlanIndex;
            const isUpgrade = index > currentPlanIndex || currentPlan === 'free';

            return (
              <Card 
                key={plan.id} 
                className={`relative ${plan.popular ? 'border-purple-500 border-2 shadow-lg' : ''} ${isCurrentPlan ? 'bg-muted' : ''}`}
              >
                {plan.popular && (
                  <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-purple-500 text-white text-xs font-semibold px-3 py-1 rounded-full">
                    Most Popular
                  </div>
                )}
                <CardContent className="p-6">
                  <div className="text-center mb-4">
                    <h3 className="text-xl font-bold">{plan.name}</h3>
                    <div className="mt-2">
                      <span className="text-4xl font-bold">${plan.price}</span>
                      <span className="text-muted-foreground">/month</span>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {plan.limit} candidates/month
                    </p>
                  </div>

                  <ul className="space-y-2 mb-6">
                    {plan.features.map((feature, idx) => (
                      <li key={idx} className="flex items-start gap-2 text-sm">
                        <Check className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>

                  <Button 
                    className="w-full" 
                    variant={plan.popular ? 'default' : 'outline'}
                    disabled={isCurrentPlan || isDowngrade}
                    onClick={() => onSelectPlan(plan.id)}
                  >
                    {isCurrentPlan ? 'Current Plan' : isDowngrade ? 'Downgrade' : 'Upgrade'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>

        <div className="text-center mt-4">
          <p className="text-sm text-muted-foreground">
            Need more? <a href="mailto:sales@example.com" className="text-primary hover:underline">Contact us for Enterprise pricing</a>
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
