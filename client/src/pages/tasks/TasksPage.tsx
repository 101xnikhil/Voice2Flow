import React, { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tasksApi } from '../../lib/api/tasks.js';
import {
  TaskDTO,
  TaskPriority,
  TaskCategory,
  CreateTaskInput,
  UpdateTaskInput,
  TaskQueryFilters,
} from '@voice2flow/shared';
import { Tabs } from '../../components/ui/Tabs.js';
import { Button } from '../../components/ui/Button.js';
import { Input } from '../../components/ui/Input.js';
import { Textarea } from '../../components/ui/Textarea.js';
import { Select } from '../../components/ui/Select.js';
import { Drawer } from '../../components/ui/Drawer.js';
import { Modal } from '../../components/ui/Modal.js';
import { PriorityChip } from '../../components/ui/PriorityChip.js';
import { CategoryChip } from '../../components/ui/CategoryChip.js';
import { Skeleton } from '../../components/ui/Skeleton.js';
import { EmptyState } from '../../components/ui/EmptyState.js';
import {
  Plus,
  Search,
  CheckCircle2,
  Circle,
  RotateCcw,
  Trash2,
  Edit2,
  Calendar,
  Clock,
  User as UserIcon,
  MapPin,
  Repeat,
  CheckCheck,
  AlertTriangle,
} from 'lucide-react';
import { toast } from 'sonner';

type TaskTab = 'active' | 'completed' | 'overdue' | 'trash';

export const TasksPage: React.FC = () => {
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState<TaskTab>('active');
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('ALL');
  const [filterPriority, setFilterPriority] = useState<string>('ALL');
  const [sortBy, setSortBy] = useState<string>('dueAt:asc');

  // Multi-select state
  const [selectedTaskIds, setSelectedTaskIds] = useState<string[]>([]);

  // Drawer / Form state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);

  // Permanent Delete Modal
  const [taskToDeletePermanently, setTaskToDeletePermanently] = useState<TaskDTO | null>(null);

  // Form values
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState<TaskCategory>('OTHER');
  const [priority, setPriority] = useState<TaskPriority>('MEDIUM');
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('12:00');
  const [isAllDay, setIsAllDay] = useState(false);
  const [estimatedMinutes, setEstimatedMinutes] = useState('');
  const [personName, setPersonName] = useState('');
  const [location, setLocation] = useState('');
  const [recurrence, setRecurrence] = useState('NONE');

  // Query: fetch tasks
  const { data: tasks = [], isLoading } = useQuery<TaskDTO[]>({
    queryKey: ['tasks', activeTab, filterCategory, filterPriority, sortBy, searchQuery],
    queryFn: () =>
      tasksApi.listTasks({
        tab: activeTab,
        category: filterCategory !== 'ALL' ? (filterCategory as TaskCategory) : undefined,
        priority: filterPriority !== 'ALL' ? (filterPriority as TaskPriority) : undefined,
        sort: sortBy as TaskQueryFilters['sort'],
        q: searchQuery.trim() || undefined,
      }),
  });

  // Query counts for tab badges
  const { data: allActiveTasks = [] } = useQuery<TaskDTO[]>({
    queryKey: ['tasks', 'count', 'active'],
    queryFn: () => tasksApi.listTasks({ tab: 'active' }),
  });
  const { data: allCompletedTasks = [] } = useQuery<TaskDTO[]>({
    queryKey: ['tasks', 'count', 'completed'],
    queryFn: () => tasksApi.listTasks({ tab: 'completed' }),
  });
  const { data: allOverdueTasks = [] } = useQuery<TaskDTO[]>({
    queryKey: ['tasks', 'count', 'overdue'],
    queryFn: () => tasksApi.listTasks({ tab: 'overdue' }),
  });
  const { data: allTrashTasks = [] } = useQuery<TaskDTO[]>({
    queryKey: ['tasks', 'count', 'trash'],
    queryFn: () => tasksApi.listTasks({ tab: 'trash' }),
  });

  // Create Mutation
  const createMutation = useMutation({
    mutationFn: (input: CreateTaskInput) => tasksApi.createTask(input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task created successfully');
      closeDrawer();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create task');
    },
  });

  // Update Mutation
  const updateMutation = useMutation({
    mutationFn: ({ id, input }: { id: string; input: UpdateTaskInput }) =>
      tasksApi.updateTask(id, input),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success('Task updated');
      closeDrawer();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to update task');
    },
  });

  // Complete Mutation (with Undo)
  const completeMutation = useMutation({
    mutationFn: (id: string) => tasksApi.completeTask(id),
    onSuccess: (completedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Completed "${completedTask.title}"`, {
        action: {
          label: 'Undo',
          onClick: () => reopenMutation.mutate(completedTask.id),
        },
      });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to complete task'),
  });

  // Reopen Mutation
  const reopenMutation = useMutation({
    mutationFn: (id: string) => tasksApi.reopenTask(id),
    onSuccess: (reopenedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Reopened "${reopenedTask.title}"`);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to reopen task'),
  });

  // Soft Delete Mutation (with Undo)
  const softDeleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.softDeleteTask(id),
    onSuccess: (deletedTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds((prev) => prev.filter((id) => id !== deletedTask.id));
      toast.success(`Moved "${deletedTask.title}" to trash`, {
        action: {
          label: 'Undo',
          onClick: () => restoreMutation.mutate(deletedTask.id),
        },
      });
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete task'),
  });

  // Restore Mutation
  const restoreMutation = useMutation({
    mutationFn: (id: string) => tasksApi.restoreTask(id),
    onSuccess: (restoredTask) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      toast.success(`Restored "${restoredTask.title}"`);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to restore task'),
  });

  // Permanent Delete Mutation
  const permanentDeleteMutation = useMutation({
    mutationFn: (id: string) => tasksApi.permanentDeleteTask(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds((prev) =>
        prev.filter((id) => id !== taskToDeletePermanently?.id)
      );
      toast.success('Task permanently deleted');
      setTaskToDeletePermanently(null);
    },
    onError: (err: Error) => toast.error(err.message || 'Failed to delete task'),
  });

  // Bulk Actions Mutation
  const bulkActionMutation = useMutation({
    mutationFn: (action: 'complete' | 'delete' | 'restore') =>
      tasksApi.bulkAction({
        action,
        taskIds: selectedTaskIds,
      }),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setSelectedTaskIds([]);
      toast.success(`Bulk action completed (${res.count} tasks updated)`);
    },
    onError: (err: Error) => toast.error(err.message || 'Bulk action failed'),
  });

  const openCreateDrawer = () => {
    setEditingTask(null);
    setTitle('');
    setDescription('');
    setCategory('OTHER');
    setPriority('MEDIUM');
    setDueDate('');
    setDueTime('12:00');
    setIsAllDay(false);
    setEstimatedMinutes('');
    setPersonName('');
    setLocation('');
    setRecurrence('NONE');
    setIsDrawerOpen(true);
  };

  const openEditDrawer = (task: TaskDTO) => {
    setEditingTask(task);
    setTitle(task.title);
    setDescription(task.description || '');
    setCategory(task.category);
    setPriority(task.priority);
    if (task.dueAt) {
      const d = new Date(task.dueAt);
      setDueDate(d.toISOString().split('T')[0] || '');
      setDueTime(
        `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
      );
    } else {
      setDueDate('');
      setDueTime('12:00');
    }
    setIsAllDay(task.isAllDay);
    setEstimatedMinutes(task.estimatedMinutes ? String(task.estimatedMinutes) : '');
    setPersonName(task.personName || '');
    setLocation(task.location || '');
    setRecurrence(task.recurrenceRule || 'NONE');
    setIsDrawerOpen(true);
  };

  const closeDrawer = () => {
    setIsDrawerOpen(false);
    setEditingTask(null);
  };

  const handleSaveTask = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    let computedDueAt: string | null = null;
    if (dueDate) {
      if (isAllDay) {
        computedDueAt = new Date(`${dueDate}T00:00:00.000Z`).toISOString();
      } else {
        computedDueAt = new Date(`${dueDate}T${dueTime || '12:00'}:00.000Z`).toISOString();
      }
    }

    const payload = {
      title: title.trim(),
      description: description.trim() || null,
      category,
      priority,
      dueAt: computedDueAt,
      isAllDay,
      estimatedMinutes: estimatedMinutes ? parseInt(estimatedMinutes, 10) : null,
      personName: personName.trim() || null,
      location: location.trim() || null,
      recurrenceRule: recurrence !== 'NONE' ? recurrence : null,
    };

    if (editingTask) {
      updateMutation.mutate({ id: editingTask.id, input: payload });
    } else {
      createMutation.mutate(payload);
    }
  };

  const toggleSelectTask = (id: string) => {
    setSelectedTaskIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedTaskIds.length === tasks.length) {
      setSelectedTaskIds([]);
    } else {
      setSelectedTaskIds(tasks.map((t) => t.id));
    }
  };

  // Group tasks by relative date
  const groupedTasks = useMemo(() => {
    if (activeTab === 'trash' || activeTab === 'completed') {
      return { 'All Items': tasks };
    }

    const groups: {
      Overdue: TaskDTO[];
      Today: TaskDTO[];
      Tomorrow: TaskDTO[];
      'This Week': TaskDTO[];
      Later: TaskDTO[];
      'No Date': TaskDTO[];
    } = {
      Overdue: [],
      Today: [],
      Tomorrow: [],
      'This Week': [],
      Later: [],
      'No Date': [],
    };

    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const endOfWeek = new Date(now);
    endOfWeek.setDate(endOfWeek.getDate() + (7 - endOfWeek.getDay()));

    tasks.forEach((task) => {
      if (!task.dueAt) {
        groups['No Date'].push(task);
        return;
      }

      const due = new Date(task.dueAt);
      const dueStr = due.toISOString().split('T')[0];

      if (due < now && dueStr !== todayStr) {
        groups['Overdue'].push(task);
      } else if (dueStr === todayStr) {
        groups['Today'].push(task);
      } else if (dueStr === tomorrowStr) {
        groups['Tomorrow'].push(task);
      } else if (due <= endOfWeek) {
        groups['This Week'].push(task);
      } else {
        groups['Later'].push(task);
      }
    });

    // Remove empty groups
    const result: Record<string, TaskDTO[]> = {};
    for (const [key, list] of Object.entries(groups)) {
      if (list.length > 0) {
        result[key] = list;
      }
    }

    return Object.keys(result).length > 0 ? result : { 'All Tasks': [] };
  }, [tasks, activeTab]);

  const formatDueDate = (dueAt: string | null, isAllDay: boolean) => {
    if (!dueAt) return null;
    const date = new Date(dueAt);
    const today = new Date();
    const isToday = date.toDateString() === today.toDateString();

    const dateFormatted = date.toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
    });

    if (isAllDay) {
      return isToday ? 'Today (All Day)' : `${dateFormatted} (All Day)`;
    }

    const timeFormatted = date.toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
    });

    return isToday ? `Today at ${timeFormatted}` : `${dateFormatted} at ${timeFormatted}`;
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-[var(--text)]">Tasks</h1>
          <p className="text-sm text-[var(--text-muted)] mt-0.5">
            Organize, track, and complete your scheduled commitments
          </p>
        </div>
        <Button
          variant="primary"
          onClick={openCreateDrawer}
          leftIcon={<Plus className="w-4 h-4" />}
          className="shadow-md"
        >
          New Task
        </Button>
      </div>

      {/* Tabs */}
      <Tabs
        tabs={[
          { id: 'active', label: 'Active', count: allActiveTasks.length },
          { id: 'completed', label: 'Completed', count: allCompletedTasks.length },
          { id: 'overdue', label: 'Overdue', count: allOverdueTasks.length },
          { id: 'trash', label: 'Trash', count: allTrashTasks.length },
        ]}
        activeTab={activeTab}
        onChange={(tab) => {
          setActiveTab(tab as TaskTab);
          setSelectedTaskIds([]);
        }}
      />

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <Input
            placeholder="Search tasks..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            leftIcon={<Search className="w-4 h-4" />}
            className="w-full"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto">
          <Select
            options={[
              { value: 'ALL', label: 'All Categories' },
              { value: 'ACADEMIC', label: 'Academic' },
              { value: 'PERSONAL', label: 'Personal' },
              { value: 'PROJECT', label: 'Project' },
              { value: 'WORK', label: 'Work' },
              { value: 'OTHER', label: 'Other' },
            ]}
            value={filterCategory}
            onChange={(e) => setFilterCategory(e.target.value)}
            className="w-36 text-xs"
          />

          <Select
            options={[
              { value: 'ALL', label: 'All Priorities' },
              { value: 'LOW', label: 'Low' },
              { value: 'MEDIUM', label: 'Medium' },
              { value: 'HIGH', label: 'High' },
              { value: 'URGENT', label: 'Urgent' },
            ]}
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            className="w-32 text-xs"
          />

          <Select
            options={[
              { value: 'dueAt:asc', label: 'Due Date ↑' },
              { value: 'dueAt:desc', label: 'Due Date ↓' },
              { value: 'priority:desc', label: 'Priority ↓' },
              { value: 'createdAt:desc', label: 'Created ↓' },
              { value: 'title:asc', label: 'Title (A-Z)' },
            ]}
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            className="w-36 text-xs"
          />
        </div>
      </div>

      {/* Task List or Skeletons or Empty States */}
      {isLoading ? (
        <div className="flex flex-col gap-3">
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
          <Skeleton className="h-16 w-full rounded-xl" />
        </div>
      ) : tasks.length === 0 ? (
        <EmptyState
          icon={activeTab === 'trash' ? <Trash2 className="w-6 h-6" /> : <CheckCircle2 className="w-6 h-6" />}
          title={
            activeTab === 'trash'
              ? 'Trash is empty'
              : activeTab === 'completed'
              ? 'No completed tasks yet'
              : activeTab === 'overdue'
              ? 'No overdue tasks!'
              : 'No tasks found'
          }
          description={
            activeTab === 'active'
              ? 'Get started by creating your first task using the "New Task" button.'
              : undefined
          }
          action={
            activeTab === 'active' ? (
              <Button
                variant="primary"
                onClick={openCreateDrawer}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Task
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-6">
          {Object.entries(groupedTasks).map(([groupTitle, groupItems]) => (
            <div key={groupTitle} className="flex flex-col gap-2">
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                  {groupTitle} ({groupItems.length})
                </span>
                {groupTitle === Object.keys(groupedTasks)[0] && tasks.length > 0 && (
                  <button
                    onClick={toggleSelectAll}
                    className="text-xs text-[#7C5CFF] hover:underline font-medium"
                  >
                    {selectedTaskIds.length === tasks.length ? 'Deselect All' : 'Select All'}
                  </button>
                )}
              </div>

              <div className="flex flex-col gap-2">
                {groupItems.map((task) => {
                  const isSelected = selectedTaskIds.includes(task.id);
                  const isCompleted = task.status === 'COMPLETED';
                  const isOverdue =
                    task.dueAt && new Date(task.dueAt) < new Date() && !isCompleted;

                  return (
                    <div
                      key={task.id}
                      className={`group relative flex items-center justify-between p-3.5 sm:p-4 rounded-xl border bg-[var(--surface)] transition-all duration-150 shadow-sm hover:shadow hover:border-[#7C5CFF]/30 ${
                        isSelected ? 'border-[#7C5CFF] ring-1 ring-[#7C5CFF]' : 'border-[var(--border)]'
                      } ${isCompleted ? 'opacity-70 bg-[var(--surface)]/60' : ''}`}
                    >
                      <div className="flex items-center gap-3.5 min-w-0 flex-1">
                        {/* Multi-select Checkbox */}
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectTask(task.id)}
                          aria-label={`Select task ${task.title}`}
                          className="w-4 h-4 rounded text-[#7C5CFF] focus:ring-[#7C5CFF] border-[var(--border)] cursor-pointer"
                        />

                        {/* Status Check / Complete Button */}
                        {activeTab !== 'trash' && (
                          <button
                            type="button"
                            onClick={() =>
                              isCompleted
                                ? reopenMutation.mutate(task.id)
                                : completeMutation.mutate(task.id)
                            }
                            aria-label={isCompleted ? 'Reopen task' : 'Complete task'}
                            className="flex-shrink-0 text-[var(--text-muted)] hover:text-[#059669] transition-colors"
                          >
                            {isCompleted ? (
                              <CheckCircle2 className="w-5 h-5 text-[#059669]" />
                            ) : (
                              <Circle className="w-5 h-5 hover:stroke-[#059669]" />
                            )}
                          </button>
                        )}

                        {/* Content */}
                        <div className="flex flex-col min-w-0 flex-1 pr-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`text-sm font-medium truncate ${
                                isCompleted
                                  ? 'line-through text-[var(--text-muted)]'
                                  : 'text-[var(--text)]'
                              }`}
                            >
                              {task.title}
                            </span>
                            <PriorityChip priority={task.priority} size="sm" />
                            <CategoryChip category={task.category} size="sm" />
                            {task.recurrenceRule && (
                              <span title={`Repeats: ${task.recurrenceRule}`}>
                                <Repeat className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                              </span>
                            )}
                          </div>

                          {task.description && (
                            <p className="text-xs text-[var(--text-muted)] line-clamp-1 mt-0.5">
                              {task.description}
                            </p>
                          )}

                          {/* Metadata strip */}
                          <div className="flex items-center gap-3 text-[11px] text-[var(--text-muted)] mt-1.5 flex-wrap">
                            {task.dueAt && (
                              <span
                                className={`flex items-center gap-1 ${
                                  isOverdue ? 'text-[#DC2626] font-semibold' : ''
                                }`}
                              >
                                <Calendar className="w-3 h-3" />
                                {formatDueDate(task.dueAt, task.isAllDay)}
                              </span>
                            )}
                            {task.estimatedMinutes && (
                              <span className="flex items-center gap-1">
                                <Clock className="w-3 h-3" />
                                {task.estimatedMinutes}m
                              </span>
                            )}
                            {task.personName && (
                              <span className="flex items-center gap-1">
                                <UserIcon className="w-3 h-3" />
                                {task.personName}
                              </span>
                            )}
                            {task.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="w-3 h-3" />
                                {task.location}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Actions */}
                      <div className="flex items-center gap-1 opacity-90 sm:opacity-0 group-hover:opacity-100 transition-opacity">
                        {activeTab === 'trash' ? (
                          <>
                            <button
                              onClick={() => restoreMutation.mutate(task.id)}
                              title="Restore task"
                              aria-label="Restore task"
                              className="p-1.5 text-[var(--text-muted)] hover:text-[#059669] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                            >
                              <RotateCcw className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => setTaskToDeletePermanently(task)}
                              title="Delete permanently"
                              aria-label="Delete permanently"
                              className="p-1.5 text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        ) : (
                          <>
                            <button
                              onClick={() => openEditDrawer(task)}
                              title="Edit task"
                              aria-label="Edit task"
                              className="p-1.5 text-[var(--text-muted)] hover:text-[var(--text)] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => softDeleteMutation.mutate(task.id)}
                              title="Move to trash"
                              aria-label="Move to trash"
                              className="p-1.5 text-[var(--text-muted)] hover:text-[#DC2626] hover:bg-[var(--surface-2)] rounded-lg transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Floating Bulk Actions Bar */}
      {selectedTaskIds.length > 0 && (
        <div className="fixed bottom-20 md:bottom-6 left-1/2 -translate-x-1/2 z-40 bg-[var(--surface)] border border-[var(--border)] shadow-2xl rounded-2xl px-5 py-3 flex items-center gap-3 animate-in fade-in slide-in-from-bottom-4">
          <span className="text-xs font-semibold text-[var(--text)]">
            {selectedTaskIds.length} selected
          </span>
          <div className="h-4 w-px bg-[var(--border)]" />
          {activeTab !== 'trash' ? (
            <>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => bulkActionMutation.mutate('complete')}
                leftIcon={<CheckCheck className="w-3.5 h-3.5" />}
              >
                Complete
              </Button>
              <Button
                variant="danger"
                size="sm"
                onClick={() => bulkActionMutation.mutate('delete')}
                leftIcon={<Trash2 className="w-3.5 h-3.5" />}
              >
                Delete
              </Button>
            </>
          ) : (
            <Button
              variant="secondary"
              size="sm"
              onClick={() => bulkActionMutation.mutate('restore')}
              leftIcon={<RotateCcw className="w-3.5 h-3.5" />}
            >
              Restore
            </Button>
          )}
          <button
            onClick={() => setSelectedTaskIds([])}
            className="text-xs text-[var(--text-muted)] hover:text-[var(--text)] ml-1"
          >
            Clear
          </button>
        </div>
      )}

      {/* Create / Edit Task Drawer */}
      <Drawer
        isOpen={isDrawerOpen}
        onClose={closeDrawer}
        title={editingTask ? 'Edit Task' : 'Create New Task'}
        description={editingTask ? 'Modify the details of this task' : 'Add a task to your workspace'}
      >
        <form onSubmit={handleSaveTask} className="flex flex-col gap-4">
          <Input
            label="Title *"
            placeholder="e.g. Finish DBMS assignment"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            required
            autoFocus
          />

          <Textarea
            label="Description"
            placeholder="Add relevant notes or sub-tasks..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
          />

          <div className="grid grid-cols-2 gap-3">
            <Select
              label="Category"
              options={[
                { value: 'ACADEMIC', label: 'Academic' },
                { value: 'PERSONAL', label: 'Personal' },
                { value: 'PROJECT', label: 'Project' },
                { value: 'WORK', label: 'Work' },
                { value: 'OTHER', label: 'Other' },
              ]}
              value={category}
              onChange={(e) => setCategory(e.target.value as TaskCategory)}
            />

            <Select
              label="Priority"
              options={[
                { value: 'LOW', label: 'Low' },
                { value: 'MEDIUM', label: 'Medium' },
                { value: 'HIGH', label: 'High' },
                { value: 'URGENT', label: 'Urgent' },
              ]}
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-medium text-[var(--text)]">Due Date & Time</label>
              <label className="text-xs flex items-center gap-1.5 cursor-pointer text-[var(--text-muted)] select-none">
                <input
                  type="checkbox"
                  checked={isAllDay}
                  onChange={(e) => setIsAllDay(e.target.checked)}
                  className="rounded text-[#7C5CFF] focus:ring-[#7C5CFF]"
                />
                All day
              </label>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
              />
              {!isAllDay && (
                <Input
                  type="time"
                  value={dueTime}
                  onChange={(e) => setDueTime(e.target.value)}
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Estimated Duration"
              type="number"
              placeholder="30"
              min="1"
              value={estimatedMinutes}
              onChange={(e) => setEstimatedMinutes(e.target.value)}
              helper="In minutes"
            />

            <Select
              label="Recurrence"
              options={[
                { value: 'NONE', label: 'None' },
                { value: 'DAILY', label: 'Daily' },
                { value: 'WEEKLY', label: 'Weekly' },
                { value: 'MONTHLY', label: 'Monthly' },
              ]}
              value={recurrence}
              onChange={(e) => setRecurrence(e.target.value)}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Person"
              placeholder="e.g. Dr. Verma"
              value={personName}
              onChange={(e) => setPersonName(e.target.value)}
            />
            <Input
              label="Location"
              placeholder="e.g. Lab 4 / Zoom"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-4 border-t border-[var(--border)] mt-2">
            <Button type="button" variant="outline" onClick={closeDrawer}>
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              isLoading={createMutation.isPending || updateMutation.isPending}
            >
              {editingTask ? 'Save Changes' : 'Create Task'}
            </Button>
          </div>
        </form>
      </Drawer>

      {/* Permanent Delete Confirmation Modal */}
      <Modal
        isOpen={taskToDeletePermanently !== null}
        onClose={() => setTaskToDeletePermanently(null)}
        title="Permanently Delete Task"
      >
        <div className="flex flex-col gap-4">
          <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-[#DC2626]">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <div className="text-xs">
              <p className="font-semibold">This action cannot be undone.</p>
              <p className="mt-0.5">
                The task &ldquo;{taskToDeletePermanently?.title}&rdquo; will be permanently deleted from
                the database.
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setTaskToDeletePermanently(null)}
            >
              Cancel
            </Button>
            <Button
              variant="danger"
              isLoading={permanentDeleteMutation.isPending}
              onClick={() => {
                if (taskToDeletePermanently) {
                  permanentDeleteMutation.mutate(taskToDeletePermanently.id);
                }
              }}
            >
              Delete Permanently
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
