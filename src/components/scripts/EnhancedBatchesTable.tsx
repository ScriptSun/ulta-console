import { useState } from 'react';
import { Play, Pause, Square, Eye, Settings, Trash2, FileText } from 'lucide-react';
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
import { Badge } from '@/components/ui/badge';

interface ScriptBatch {
  id: string;
  batch_name: string;
  script_keys: string[];
  latest_sha256: string;
  risk_level: 'low' | 'medium' | 'high' | 'critical';
  max_timeout_sec: number;
  status: 'active' | 'inactive' | 'deprecated' | 'testing';
  updated_at: string;
  created_at: string;
  version_count: number;
  last_run?: string;
  success_rate?: number;
}

interface EnhancedBatchesTableProps {
  onBatchClick?: (batch: ScriptBatch) => void;
  onBatchEdit?: (batch: ScriptBatch) => void;
  onBatchDelete?: (batch: ScriptBatch) => void;
  onBatchRun?: (batch: ScriptBatch) => void;
  onViewVersions?: (batch: ScriptBatch) => void;
  onViewLogs?: (batch: ScriptBatch) => void;
}

// Mock data fetch function - replace with actual API call
const fetchBatches = async (state: ServerTableState): Promise<ServerTableResponse<ScriptBatch>> => {
  console.log('Fetching batches with state:', state);
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const mockBatches: ScriptBatch[] = [
    {
      id: '1',
      batch_name: 'Database Cleanup',
      script_keys: ['cleanup-logs', 'vacuum-db', 'reindex-tables'],
      latest_sha256: 'a1b2c3d4e5f6...',
      risk_level: 'medium',
      max_timeout_sec: 3600,
      status: 'active',
      updated_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      version_count: 5,
      last_run: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      success_rate: 95
    },
    {
      id: '2',
      batch_name: 'User Data Migration',
      script_keys: ['export-users', 'transform-data', 'import-users'],
      latest_sha256: 'f6e5d4c3b2a1...',
      risk_level: 'high',
      max_timeout_sec: 7200,
      status: 'testing',
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      version_count: 12,
      last_run: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      success_rate: 87
    },
    {
      id: '3',
      batch_name: 'System Health Check',
      script_keys: ['check-disk', 'check-memory', 'check-network'],
      latest_sha256: '123456789abc...',
      risk_level: 'low',
      max_timeout_sec: 900,
      status: 'active',
      updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      version_count: 8,
      last_run: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      success_rate: 100
    },
    {
      id: '4',
      batch_name: 'Security Audit',
      script_keys: ['scan-vulnerabilities', 'check-permissions', 'audit-logs'],
      latest_sha256: 'def456789123...',
      risk_level: 'critical',
      max_timeout_sec: 5400,
      status: 'inactive',
      updated_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      version_count: 3,
      last_run: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      success_rate: 92
    },
    {
      id: '5',
      batch_name: 'Backup Routine',
      script_keys: ['backup-database', 'backup-files', 'verify-backup'],
      latest_sha256: '789abc123def...',
      risk_level: 'medium',
      max_timeout_sec: 1800,
      status: 'deprecated',
      updated_at: new Date(Date.now() - 14 * 24 * 60 * 60 * 1000).toISOString(),
      created_at: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
      version_count: 15,
      last_run: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      success_rate: 78
    }
  ];

  // Apply search filter
  let filteredBatches = mockBatches;
  if (state.search) {
    const searchLower = state.search.toLowerCase();
    filteredBatches = mockBatches.filter(batch => 
      batch.batch_name.toLowerCase().includes(searchLower) ||
      batch.script_keys.some(key => key.toLowerCase().includes(searchLower)) ||
      batch.latest_sha256.toLowerCase().includes(searchLower)
    );
  }

  // Apply filters
  if (state.filters.status) {
    filteredBatches = filteredBatches.filter(batch => batch.status === state.filters.status);
  }
  
  if (state.filters.risk_level) {
    filteredBatches = filteredBatches.filter(batch => batch.risk_level === state.filters.risk_level);
  }

  // Apply sorting
  if (state.sortBy) {
    filteredBatches = filteredBatches.sort((a, b) => {
      let aValue = (a as any)[state.sortBy!];
      let bValue = (b as any)[state.sortBy!];
      
      if (state.sortBy === 'updated_at' || state.sortBy === 'created_at' || state.sortBy === 'last_run') {
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

  const totalCount = filteredBatches.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const paginatedData = filteredBatches.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    totalCount,
    page: state.page,
    pageSize: state.pageSize,
    totalPages: Math.ceil(totalCount / state.pageSize)
  };
};

export function EnhancedBatchesTable({
  onBatchClick,
  onBatchEdit,
  onBatchDelete,
  onBatchRun,
  onViewVersions,
  onViewLogs
}: EnhancedBatchesTableProps) {
  const [selectedRows, setSelectedRows] = useState<ScriptBatch[]>([]);

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
    queryKey: ['batches'],
    queryFn: fetchBatches,
    initialPageSize: 25
  });

  const columns: EnhancedTableColumn<ScriptBatch>[] = [
    createSelectionColumn<ScriptBatch>(),
    createTextColumn<ScriptBatch>('batch_name', 'Batch Name'),
    {
      key: 'script_keys',
      label: 'Scripts',
      sortable: false,
      render: (batch) => (
        <div className="flex flex-wrap gap-1">
          {batch.script_keys.slice(0, 2).map((key, index) => (
            <Badge key={index} variant="outline" className="text-xs">
              {key}
            </Badge>
          ))}
          {batch.script_keys.length > 2 && (
            <Badge variant="secondary" className="text-xs">
              +{batch.script_keys.length - 2} more
            </Badge>
          )}
        </div>
      )
    },
    {
      key: 'latest_sha256',
      label: 'SHA256',
      sortable: true,
      render: (batch) => (
        <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
          {batch.latest_sha256.slice(0, 12)}...
        </code>
      )
    },
    {
      key: 'risk_level',
      label: 'Risk',
      sortable: true,
      render: (batch) => {
        const riskConfig = {
          low: { variant: 'secondary' as const, label: 'Low' },
          medium: { variant: 'default' as const, label: 'Medium' },
          high: { variant: 'destructive' as const, label: 'High' },
          critical: { variant: 'destructive' as const, label: 'Critical' }
        };
        
        const config = riskConfig[batch.risk_level];
        
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'max_timeout_sec',
      label: 'Timeout',
      sortable: true,
      render: (batch) => `${batch.max_timeout_sec}s`
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (batch) => {
        const statusConfig = {
          active: { variant: 'default' as const, label: 'Active' },
          inactive: { variant: 'secondary' as const, label: 'Inactive' },
          deprecated: { variant: 'outline' as const, label: 'Deprecated' },
          testing: { variant: 'default' as const, label: 'Testing' }
        };
        
        const config = statusConfig[batch.status];
        
        return (
          <Badge variant={config.variant}>
            {config.label}
          </Badge>
        );
      }
    },
    {
      key: 'success_rate',
      label: 'Success Rate',
      sortable: true,
      render: (batch) => (
        <span className={`font-medium ${
          (batch.success_rate || 0) >= 95 ? 'text-green-600' :
          (batch.success_rate || 0) >= 85 ? 'text-yellow-600' : 'text-red-600'
        }`}>
          {batch.success_rate || 0}%
        </span>
      )
    },
    createDateColumn<ScriptBatch>('updated_at', 'Updated'),
    createActionsColumn<ScriptBatch>([
      {
        label: 'Run Batch',
        onClick: (batch) => onBatchRun?.(batch)
      },
      {
        label: 'View Versions',
        onClick: (batch) => onViewVersions?.(batch)
      },
      {
        label: 'View Logs',
        onClick: (batch) => onViewLogs?.(batch)
      },
      {
        label: 'Edit Batch',
        onClick: (batch) => onBatchEdit?.(batch)
      },
      {
        label: 'Delete Batch',
        onClick: (batch) => onBatchDelete?.(batch),
        variant: 'destructive'
      }
    ])
  ];

  const bulkActions: BulkAction<ScriptBatch>[] = [
    {
      id: 'run',
      label: 'Run Selected',
      icon: Play,
      action: async (batches) => {
        console.log('Running batches:', batches.map(b => b.id));
      }
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: Trash2,
      variant: 'destructive',
      action: async (batches) => {
        console.log('Deleting batches:', batches.map(b => b.id));
      }
    }
  ];

  const handleRowSelect = (row: ScriptBatch, selected: boolean) => {
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
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' },
        { value: 'deprecated', label: 'Deprecated' },
        { value: 'testing', label: 'Testing' }
      ]
    },
    {
      key: 'risk_level',
      label: 'Risk Level',
      options: [
        { value: 'low', label: 'Low' },
        { value: 'medium', label: 'Medium' },
        { value: 'high', label: 'High' },
        { value: 'critical', label: 'Critical' }
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
      onRowClick={onBatchClick}
      onFilterChange={handleFilterChange}
      emptyMessage="No script batches found. Try adjusting your search criteria."
    />
  );
}