import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CheckCircle2, XCircle, Loader2, Trash2, FileX } from "lucide-react";
import { QueueItem, UploadStatus } from "@/hooks/useUploadQueue";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

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
  const [clearAllDialogOpen, setClearAllDialogOpen] = useState(false);
  
  const completedCount = queue.filter((item) => item.status === "completed").length;
  const failedCount = queue.filter((item) => item.status === "failed").length;
  const inProgressCount = queue.filter(
    (item) => item.status === "extracting" || item.status === "analyzing" || item.status === "pending"
  ).length;

  const handleClearAllClick = () => {
    setClearAllDialogOpen(true);
  };

  const confirmClearAll = () => {
    onClearAll();
    setClearAllDialogOpen(false);
  };

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onClose}>
        <SheetContent className="w-full sm:max-w-md">
          <SheetHeader className="space-y-1">
            <SheetTitle>Upload Queue</SheetTitle>
            <SheetDescription>
              Track the status of your CV uploads and analysis
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-4">
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

            {/* Action Buttons - Separated from close button with proper spacing */}
            {queue.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2 border-t">
                {completedCount > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onClearCompleted}
                    className="h-8 px-3 text-xs"
                  >
                    <CheckCircle2 className="h-3 w-3 mr-1.5" />
                    Clear Completed
                  </Button>
                )}
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleClearAllClick}
                        className="h-8 px-3 text-xs border-destructive/50 text-destructive hover:bg-destructive hover:text-destructive-foreground"
                      >
                        <FileX className="h-3 w-3 mr-1.5" />
                        Clear All
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Remove all items from queue</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
            )}

            {/* Queue Items */}
            <ScrollArea className="h-[calc(100vh-280px)]">
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

      {/* Clear All Confirmation Dialog */}
      <AlertDialog open={clearAllDialogOpen} onOpenChange={setClearAllDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Clear All Uploads</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove all {queue.length} item{queue.length !== 1 ? 's' : ''} from the upload queue? 
              This will not delete any candidates already saved to the database.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={confirmClearAll} 
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Clear All
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
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
