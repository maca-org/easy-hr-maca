import { Progress } from "@/components/ui/progress";
import { useCreditStatus } from "@/hooks/useCreditStatus";
import { Zap } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface CreditProgressBarProps {
  showLabel?: boolean;
  compact?: boolean;
}

export function CreditProgressBar({ showLabel = true, compact = false }: CreditProgressBarProps) {
  const { used, limit, remaining, percentage, loading, planType } = useCreditStatus();

  if (loading) {
    return <Skeleton className={compact ? "h-2 w-24" : "h-8 w-full"} />;
  }

  const isUnlimited = limit === 'unlimited';
  const isNearLimit = !isUnlimited && percentage >= 80;
  const isAtLimit = !isUnlimited && percentage >= 100;

  const getProgressColor = () => {
    if (isAtLimit) return "bg-destructive";
    if (isNearLimit) return "bg-yellow-500";
    return "bg-primary";
  };

  if (compact) {
    return (
      <div className="flex items-center gap-2">
        <Zap className="h-3.5 w-3.5 text-muted-foreground" />
        <div className="flex items-center gap-1.5">
          <Progress 
            value={isUnlimited ? 0 : percentage} 
            className="h-1.5 w-16"
          />
          <span className="text-xs text-muted-foreground">
            {isUnlimited ? '∞' : `${used}/${limit}`}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {showLabel && (
        <div className="flex items-center justify-between text-sm">
          <div className="flex items-center gap-2">
            <Zap className="h-4 w-4 text-primary" />
            <span className="text-muted-foreground">Monthly Credits</span>
          </div>
          <span className={`font-medium ${isAtLimit ? 'text-destructive' : isNearLimit ? 'text-yellow-600' : 'text-foreground'}`}>
            {isUnlimited ? (
              'Unlimited'
            ) : (
              <>
                {remaining} remaining
                <span className="text-muted-foreground font-normal"> / {limit}</span>
              </>
            )}
          </span>
        </div>
      )}
      <Progress 
        value={isUnlimited ? 0 : percentage} 
        className={`h-2 ${isAtLimit ? '[&>div]:bg-destructive' : isNearLimit ? '[&>div]:bg-yellow-500' : ''}`}
      />
      {isAtLimit && (
        <p className="text-xs text-destructive">
          You've reached your monthly limit. Upgrade for more credits.
        </p>
      )}
    </div>
  );
}
