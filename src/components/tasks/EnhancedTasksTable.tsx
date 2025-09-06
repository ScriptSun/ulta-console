import { useState } from 'react';
import { Play, Pause, Square, Eye, RotateCcw, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';
import { EnhancedDataTable } from '@/components/ui/enhanced-data-table';
import { useServerTable } from '@/hooks/useServerTable';
import { 
  createSelectionColumn,
  createTextColumn,
  createDateColumn,
  createActionsColumn
} from '@/lib/columnDefinitions';
import { EnhancedTableColumn, BulkAction } from '@/types/tableTypes';
import { ServerTableState, ServerTableResponse } from '@/types/tableTypes';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';

interface Task {
  id: string;
  name: string;
  type: string;
  status: 'running' | 'completed' | 'failed' | 'queued' | 'paused';
  progress: number;
  agent: string;
  agent_id: string;
  start_time: string;
  estimated_completion?: string;
  completed_at?: string;
  error_message?: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

interface EnhancedTasksTableProps {
  onTaskClick?: (task: Task) => void;
  onTaskPause?: (task: Task) => void;
  onTaskResume?: (task: Task) => void;
  onTaskStop?: (task: Task) => void;
  onTaskRetry?: (task: Task) => void;
  onViewDetails?: (task: Task) => void;
  onViewLogs?: (task: Task) => void;
}

// Mock data fetch function - replace with actual API call
const fetchTasks = async (state: ServerTableState): Promise<ServerTableResponse<Task>> => {
  console.log('Fetching tasks with state:', state);
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockTasks: Task[] = [
    {
      id: 'task-001',
      name: 'Process customer data batch',
      type: 'Data Processing',
      status: 'running',
      progress: 75,
      agent: 'DataProcessor-001',
      agent_id: 'agent-001',
      start_time: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      estimated_completion: new Date(Date.now() + 30 * 60 * 1000).toISOString(),
      priority: 'high'
    },
    {
      id: 'task-002',
      name: 'Generate marketing content',
      type: 'Content Generation',
      status: 'completed',
      progress: 100,
      agent: 'ContentGenerator-002',
      agent_id: 'agent-002',
      start_time: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      completed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      priority: 'medium'
    },
    {
      id: 'task-003',
      name: 'Analyze user sentiment',
      type: 'Natural Language Processing',
      status: 'failed',
      progress: 45,
      agent: 'TextAnalyzer-003',
      agent_id: 'agent-003',
      start_time: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      error_message: 'Insufficient training data',
      priority: 'low'
    },
    {
      id: 'task-004',
      name: 'Image classification batch',
      type: 'Computer Vision',
      status: 'queued',
      progress: 0,
      agent: 'ImageProcessor-004',
      agent_id: 'agent-004',
      start_time: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
      priority: 'medium'
    },
    {
      id: 'task-005',
      name: 'Database optimization',
      type: 'System Maintenance',
      status: 'paused',
      progress: 30,
      agent: 'SystemOptimizer-005',
      agent_id: 'agent-005',
      start_time: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      priority: 'critical'
    },
    {
      id: 'task-006',
      name: 'Generate API documentation',
      type: 'Documentation',
      status: 'running',
      progress: 60,
      agent: 'DocGenerator-006',
      agent_id: 'agent-006',
      start_time: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      estimated_completion: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      priority: 'low'
    }
  ];

  // Apply search filter
  let filteredTasks = mockTasks;
  if (state.search) {
    const searchLower = state.search.toLowerCase();
    filteredTasks = mockTasks.filter(task => 
      task.name.toLowerCase().includes(searchLower) ||
      task.type.toLowerCase().includes(searchLower) ||
      task.agent.toLowerCase().includes(searchLower) ||
      task.id.toLowerCase().includes(searchLower)
    );
  }

  // Apply filters
  if (state.filters.status) {
    filteredTasks = filteredTasks.filter(task => task.status === state.filters.status);
  }
  
  if (state.filters.type) {
    filteredTasks = filteredTasks.filter(task => task.type === state.filters.type);
  }
  
  if (state.filters.priority) {
    filteredTasks = filteredTasks.filter(task => task.priority === state.filters.priority);
  }

  // Apply sorting
  if (state.sortBy) {
    filteredTasks = filteredTasks.sort((a, b) => {
      let aValue = (a as any)[state.sortBy!];
      let bValue = (b as any)[state.sortBy!];
      
      if (state.sortBy === 'start_time' || state.sortBy === 'completed_at') {
        aValue = new Date(aValue).getTime();
        bValue = new Date(bValue).getTime();
      }
      
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return state.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalCount = filteredTasks.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const paginatedData = filteredTasks.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    totalCount,
    page: state.page,
    pageSize: state.pageSize,
    totalPages: Math.ceil(totalCount / state.pageSize)
  };
};

export function EnhancedTasksTable({
  onTaskClick,
  onTaskPause,
  onTaskResume,
  onTaskStop,
  onTaskRetry,
  onViewDetails,
  onViewLogs
}: EnhancedTasksTableProps) {
  const [selectedRows, setSelectedRows] = useState<Task[]>([]);

  const {
    data,
    totalCount,
    currentPage,
    pageSize,
    totalPages,
    isLoading,
    error,
    tableState,
    updateSearch,
    updateFilters,
    updateSort,
    updatePage,
    updatePageSize,
  } = useServerTable({
    queryKey: ['tasks'],
    queryFn: fetchTasks,
    initialPageSize: 25
  });

  const columns: EnhancedTableColumn<Task>[] = [
    createSelectionColumn<Task>(),
    createTextColumn<Task>('name', 'Task Name'),
    createTextColumn<Task>('type', 'Type'),
    createTextColumn<Task>('agent', 'Agent'),
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (task) => {
        const statusConfig = {
          running: { variant: 'default' as const, icon: Clock, label: 'Running' },
          completed: { variant: 'secondary' as const, icon: CheckCircle, label: 'Completed' },
          failed: { variant: 'destructive' as const, icon: XCircle, label: 'Failed' },
          queued: { variant: 'outline' as const, icon: AlertCircle, label: 'Queued' },
          paused: { variant: 'secondary' as const, icon: Pause, label: 'Paused' }
        };
        
        const config = statusConfig[task.status];
        const Icon = config.icon;
        
        return (
          <Badge variant={config.variant} className="gap-1.5">
            <Icon className="h-3 w-3" />
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'progress',
      label: 'Progress',
      sortable: true,
      render: (task) => (
        <div className="flex items-center gap-2 min-w-[100px]">
          <Progress value={task.progress} className="w-16" />
          <span className="text-xs text-muted-foreground min-w-[30px]">
            {task.progress}%
          </span>
        </div>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      sortable: true,
      render: (task) => {
        const priorityConfig = {
          low: { variant: 'secondary' as const, label: 'Low' },
          medium: { variant: 'outline' as const, label: 'Medium' },
          high: { variant: 'default' as const, label: 'High' },
          critical: { variant: 'destructive' as const, label: 'Critical' }
        };
        
        const config = priorityConfig[task.priority];
        
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        );
      }
    },
    createDateColumn<Task>('start_time', 'Started'),
    createActionsColumn<Task>([
      {
        label: 'View Details',
        onClick: (task) => onViewDetails?.(task)
      },
      {
        label: 'View Logs',
        onClick: (task) => onViewLogs?.(task)
      },
      {
        label: 'Pause',
        onClick: (task) => onTaskPause?.(task)
      },
      {
        label: 'Resume',
        onClick: (task) => onTaskResume?.(task)
      },
      {
        label: 'Stop',
        onClick: (task) => onTaskStop?.(task)
      },
      {
        label: 'Retry',
        onClick: (task) => onTaskRetry?.(task)
      }
    ])
  ];

  const bulkActions: BulkAction<Task>[] = [
    {
      id: 'pause',
      label: 'Pause Selected',
      icon: Pause,
      action: async (tasks) => {
        console.log('Pausing tasks:', tasks.map(t => t.id));
      }
    },
    {
      id: 'stop',
      label: 'Stop Selected',
      icon: Square,
      variant: 'destructive',
      action: async (tasks) => {
        console.log('Stopping tasks:', tasks.map(t => t.id));
      }
    },
    {
      id: 'retry',
      label: 'Retry Selected',
      icon: RotateCcw,
      action: async (tasks) => {
        console.log('Retrying tasks:', tasks.map(t => t.id));
      }
    }
  ];

  const handleRowSelect = (row: Task, selected: boolean) => {
    if (selected) {
      setSelectedRows(prev => [...prev, row]);
    } else {
      setSelectedRows(prev => prev.filter(r => r.id !== row.id));
    }
  };

  const handleSelectAll = (selected: boolean) => {
    if (selected) {
      setSelectedRows(data);
    } else {
      setSelectedRows([]);
    }
  };

  const handleFilterChange = (key: string, value: string) => {
    const newFilters = { ...tableState.filters };
    if (value === '' || value === 'all') {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    updateFilters(newFilters);
  };

  const filterOptions = [
    {
      key: 'status',
      label: 'Status',
      options: [
        { value: 'running', label: 'Running' },
        { value: 'completed', label: 'Completed' },
        { value: 'failed', label: 'Failed' },
        { value: 'queued', label: 'Queued' },
        { value: 'paused', label: 'Paused' }
      ]
    },
    {
      key: 'type',
      label: 'Type',
      options: [
        { value: 'Data Processing', label: 'Data Processing' },
        { value: 'Content Generation', label: 'Content Generation' },
        { value: 'Natural Language Processing', label: 'NLP' },
        { value: 'Computer Vision', label: 'Computer Vision' },
        { value: 'System Maintenance', label: 'System Maintenance' },
        { value: 'Documentation', label: 'Documentation' }
      ]
    },
    {
      key: 'priority',
      label: 'Priority',
      options: [
        { value: 'critical', label: 'Critical' },
        { value: 'high', label: 'High' },
        { value: 'medium', label: 'Medium' },
        { value: 'low', label: 'Low' }
      ]
    }
  ];

  return (
    <EnhancedDataTable
      data={data}
      columns={columns}
      totalCount={totalCount}
      currentPage={currentPage}
      pageSize={pageSize}
      totalPages={totalPages}
      isLoading={isLoading}
      error={error}
      searchValue={tableState.search}
      sortBy={tableState.sortBy}
      sortOrder={tableState.sortOrder}
      selectedRows={selectedRows}
      bulkActions={bulkActions}
      filters={tableState.filters}
      filterOptions={filterOptions}
      onSearchChange={updateSearch}
      onSortChange={updateSort}
      onPageChange={updatePage}
      onPageSizeChange={updatePageSize}
      onRowSelect={handleRowSelect}
      onSelectAll={handleSelectAll}
      onRowClick={onTaskClick}
      onFilterChange={handleFilterChange}
      emptyMessage="No tasks found. Try adjusting your search criteria."
    />
  );
}