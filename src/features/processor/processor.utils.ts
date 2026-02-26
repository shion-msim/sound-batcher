import type { BatchStatus, ProcessTask, TaskStatus } from './processor.types';

export function createId(): string {
  return crypto.randomUUID();
}

export function createPendingTasks(files: string[]): ProcessTask[] {
  return files.map((file) => ({
    id: createId(),
    file,
    status: 'pending',
  }));
}

export function updateTaskInQueue(
  queue: ProcessTask[],
  taskId: string,
  updates: Partial<ProcessTask>
): ProcessTask[] {
  return queue.map((task) => (task.id === taskId ? { ...task, ...updates } : task));
}

export function calculateBatchStatus(statuses: TaskStatus[]): BatchStatus {
  const hasFailed = statuses.includes('failed');
  if (!hasFailed) {
    return 'completed';
  }
  const allFailed = statuses.every((status) => status === 'failed');
  return allFailed ? 'failed' : 'partial';
}
