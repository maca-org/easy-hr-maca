import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, X, Trash2 } from "lucide-react";
import { QueueItem, UploadStatus } from "@/hooks/useUploadQueue";
import { ScrollArea } from "@/components/ui/scroll-area";

interface UploadQueueProps {
  queue: QueueItem[];
  isOpen: boolean;
  onClose: () => void;
  onClearCompleted: () => void;
  onClearAll: () => void;
}

const statusConfig: Record<UploadStatus, { icon: React.ReactNode; label: string; color: string }> = {
  pending: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />,
    label: "Pending",
    color: "text-muted-foreground",
  },
  extracting: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-blue-500" />,
    label: "Extracting text",
    color: "text-blue-500",
  },
  analyzing: {
    icon: <Loader2 className="h-4 w-4 animate-spin text-purple-500" />,
    label: "Analyzing CV",
    color: "text-purple-500",
  },
  completed: {
    icon: <CheckCircle2 className="h-4 w-4 text-green-500" />,
    label: "Completed",
    color: "text-green-500",
  },
  failed: {
    icon: <XCircle className="h-4 w-4 text-destructive" />,
    label: "Failed",
    color: "text-destructive",
  },
};

export function UploadQueue({
  queue,
  isOpen,
  onClose,
  onClearCompleted,
  onClearAll,
}: UploadQueueProps) {
  const completedCount = queue.filter((item) => item.status === "completed").length;
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const inProgressCount = queue.filter(
    (item) => item.status === "extracting" || item.status === "analyzing" || item.status === "pending"
  ).length;

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Upload Queue</span>
            <div className="flex gap-2">
              {completedCount > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearCompleted}
                  className="h-8 px-2 text-xs"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Clear Completed
                </Button>
              )}
              {queue.length > 0 && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClearAll}
                  className="h-8 px-2 text-xs text-destructive hover:text-destructive"
                >
                  <X className="h-3 w-3 mr-1" />
                  Clear All
                </Button>
              )}
            </div>
          </SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          {/* Summary */}
          <div className="flex gap-4 text-sm">
            {inProgressCount > 0 && (
              <div className="flex items-center gap-1">
                <Loader2 className="h-3 w-3 animate-spin text-blue-500" />
                <span className="text-muted-foreground">
                  {inProgressCount} in progress
                </span>
              </div>
            )}
            {completedCount > 0 && (
              <div className="flex items-center gap-1">
                <CheckCircle2 className="h-3 w-3 text-green-500" />
                <span className="text-muted-foreground">
                  {completedCount} completed
                </span>
              </div>
            )}
            {failedCount > 0 && (
              <div className="flex items-center gap-1">
                <XCircle className="h-3 w-3 text-destructive" />
                <span className="text-muted-foreground">
                  {failedCount} failed
                </span>
              </div>
            )}
          </div>

          {/* Queue Items */}
          <ScrollArea className="h-[calc(100vh-200px)]">
            <div className="space-y-3 pr-4">
              {queue.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  No uploads in queue
                </div>
              ) : (
                queue.map((item) => (
                  <QueueItemCard key={item.id} item={item} />
                ))
              )}
            </div>
          </ScrollArea>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function QueueItemCard({ item }: { item: QueueItem }) {
  const config = statusConfig[item.status];

  return (
    <div className="rounded-lg border bg-card p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{item.fileName}</p>
          <div className="flex items-center gap-1.5 mt-1">
            {config.icon}
            <span className={`text-xs ${config.color}`}>
              {config.label}
            </span>
          </div>
        </div>
      </div>

      {item.status !== "completed" && item.status !== "failed" && (
        <Progress value={item.progress} className="h-1" />
      )}

      {item.error && (
        <p className="text-xs text-destructive mt-1">{item.error}</p>
      )}
    </div>
  );
}
