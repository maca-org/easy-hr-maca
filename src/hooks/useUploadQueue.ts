import { useState } from 'react';

export type UploadStatus = 'pending' | 'extracting' | 'analyzing' | 'completed' | 'failed';

export interface QueueItem {
  id: string;
  fileName: string;
  status: UploadStatus;
  progress: number;
  error?: string;
}

export function useUploadQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [isQueueOpen, setIsQueueOpen] = useState(false);

  const addToQueue = (files: File[]) => {
    const newItems: QueueItem[] = files.map((file) => ({
      id: `${Date.now()}-${Math.random()}`,
      fileName: file.name,
      status: 'pending' as UploadStatus,
      progress: 0,
    }));
    setQueue((prev) => [...prev, ...newItems]);
    setIsQueueOpen(true);
    return newItems;
  };

  const updateQueueItem = (id: string, updates: Partial<QueueItem>) => {
    setQueue((prev) =>
      prev.map((item) =>
        item.id === id ? { ...item, ...updates } : item
      )
    );
  };

  const removeFromQueue = (id: string) => {
    setQueue((prev) => prev.filter((item) => item.id !== id));
  };

  const clearCompleted = () => {
    setQueue((prev) => prev.filter((item) => item.status !== 'completed'));
  };

  const clearAll = () => {
    setQueue([]);
  };

  return {
    queue,
    isQueueOpen,
    setIsQueueOpen,
    addToQueue,
    updateQueueItem,
    removeFromQueue,
    clearCompleted,
    clearAll,
  };
}
