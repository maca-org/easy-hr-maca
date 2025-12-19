import { Progress } from "@/components/ui/progress";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TrendingUp, AlertTriangle, XCircle } from "lucide-react";

const PLAN_LIMITS: Record<string, number> = {
  free: 25,
  starter: 100,
  pro: 250,
  business: 1000,
  enterprise: Infinity
};

const PLAN_NAMES: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  business: "Business",
  enterprise: "Enterprise"
};

interface UsageProgressBarProps {
  planType: string;
  used: number;
  onUpgrade?: () => void;
}

export function UsageProgressBar({ planType, used, onUpgrade }: UsageProgressBarProps) {
  const limit = PLAN_LIMITS[planType] ?? 25;
  const planName = PLAN_NAMES[planType] ?? "Free";
  const isUnlimited = limit === Infinity;
  
  const percentage = isUnlimited ? 0 : Math.min(100, (used / limit) * 100);
  const remaining = isUnlimited ? Infinity : Math.max(0, limit - used);
  
  // Determine color based on usage
  const getProgressColor = () => {
    if (isUnlimited) return "bg-primary";
    if (percentage >= 100) return "bg-destructive";
    if (percentage >= 80) return "bg-yellow-500";
    return "bg-primary";
  };
  
  const getStatusIcon = () => {
    if (isUnlimited) return <TrendingUp className="w-5 h-5 text-primary" />;
    if (percentage >= 100) return <XCircle className="w-5 h-5 text-destructive" />;
    if (percentage >= 80) return <AlertTriangle className="w-5 h-5 text-yellow-500" />;
    return <TrendingUp className="w-5 h-5 text-primary" />;
  };
  
  const getStatusText = () => {
    if (isUnlimited) return "Unlimited candidates";
    if (percentage >= 100) return "Monthly limit reached";
    if (percentage >= 80) return "Approaching limit";
    return "Within limit";
  };

  return (
    <Card className="border-border/50 bg-card/50">
      <CardContent className="py-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          {/* Left: Icon and Status */}
          <div className="flex items-center gap-3 shrink-0">
            {getStatusIcon()}
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-foreground">Monthly Usage</span>
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary font-medium">
                  {planName}
                </span>
              </div>
              <p className="text-xs text-muted-foreground">{getStatusText()}</p>
            </div>
          </div>
          
          {/* Center: Progress Bar */}
          <div className="flex-1 space-y-1.5">
            <div className="relative">
              <Progress 
                value={isUnlimited ? 100 : percentage} 
                className="h-3 bg-muted"
              />
              <div 
                className={`absolute top-0 left-0 h-full rounded-full transition-all ${getProgressColor()}`}
                style={{ width: `${isUnlimited ? 100 : percentage}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>
                {used} candidate{used !== 1 ? 's' : ''} auto-unlocked
              </span>
              <span>
                {isUnlimited 
                  ? "Unlimited" 
                  : `${remaining} remaining of ${limit}`
                }
              </span>
            </div>
          </div>
          
          {/* Right: Upgrade Button (if not unlimited and usage high) */}
          {!isUnlimited && percentage >= 80 && onUpgrade && (
            <Button 
              onClick={onUpgrade} 
              size="sm"
              variant={percentage >= 100 ? "default" : "outline"}
              className="shrink-0"
            >
              {percentage >= 100 ? "Upgrade Now" : "View Plans"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
