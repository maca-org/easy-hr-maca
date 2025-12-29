import { AlertTriangle, Zap, TrendingUp } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface CreditWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  used: number;
  limit: number;
  remaining: number;
  planType: string;
  onUpgrade: () => void;
}

export function CreditWarningModal({
  isOpen,
  onClose,
  used,
  limit,
  remaining,
  planType,
  onUpgrade,
}: CreditWarningModalProps) {
  const percentage = Math.min(100, (used / limit) * 100);
  const isAtLimit = remaining <= 0;

  const getPlanDisplayName = () => {
    switch (planType) {
      case "business":
        return "Business";
      case "pro":
        return "Pro";
      case "starter":
        return "Starter";
      default:
        return "Free";
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-500/10">
              <AlertTriangle className="h-6 w-6 text-amber-500" />
            </div>
            <div>
              <DialogTitle className="text-xl">
                {isAtLimit ? "Credit Limit Reached" : "Running Low on Credits"}
              </DialogTitle>
              <DialogDescription className="text-muted-foreground">
                {getPlanDisplayName()} Plan
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Credit Usage Display */}
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              <span className="text-4xl font-bold text-foreground">{used}</span>
              <span className="text-2xl text-muted-foreground">/ {limit}</span>
            </div>
            <p className="text-sm text-muted-foreground">credits used this month</p>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <Progress
              value={percentage}
              className={`h-3 ${
                isAtLimit
                  ? "[&>div]:bg-destructive"
                  : percentage >= 90
                  ? "[&>div]:bg-amber-500"
                  : ""
              }`}
            />
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">
                {percentage.toFixed(0)}% used
              </span>
              <span
                className={`font-medium ${
                  isAtLimit
                    ? "text-destructive"
                    : remaining <= 5
                    ? "text-amber-600"
                    : "text-foreground"
                }`}
              >
                {remaining} remaining
              </span>
            </div>
          </div>

          {/* Warning Message */}
          <div
            className={`rounded-lg p-4 ${
              isAtLimit
                ? "bg-destructive/10 border border-destructive/20"
                : "bg-amber-500/10 border border-amber-500/20"
            }`}
          >
            <p className="text-sm text-center">
              {isAtLimit ? (
                <>
                  You've reached your monthly credit limit. Upgrade now to unlock
                  more candidates and continue hiring.
                </>
              ) : (
                <>
                  You've used <strong>{percentage.toFixed(0)}%</strong> of your
                  monthly credits. Upgrade to avoid interruption and get more
                  credits.
                </>
              )}
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col gap-3">
            <Button
              onClick={onUpgrade}
              className="w-full gap-2"
              size="lg"
            >
              <TrendingUp className="h-4 w-4" />
              Upgrade Plan
            </Button>
            <Button
              variant="ghost"
              onClick={onClose}
              className="w-full text-muted-foreground"
            >
              Maybe Later
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
