import { useState } from 'react';
import { FileText, Download, Filter } from 'lucide-react';
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

interface AuditLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  target: string;
  target_type: string;
  ip_address: string;
  user_agent: string;
  status: 'success' | 'failure' | 'warning';
  details: string;
  session_id: string;
}

interface EnhancedAuditTableProps {
  onViewDetails?: (log: AuditLog) => void;
  onExportLogs?: (logs: AuditLog[]) => void;
}

// Mock data fetch function - replace with actual API call
const fetchAuditLogs = async (state: ServerTableState): Promise<ServerTableResponse<AuditLog>> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const mockLogs: AuditLog[] = [
    {
      id: '1',
      timestamp: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      actor: 'john.doe@example.com',
      action: 'agent.start',
      target: 'agent-001',
      target_type: 'agent',
      ip_address: '192.168.1.50',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      details: 'Agent started successfully',
      session_id: 'sess_abc123'
    },
    {
      id: '2',
      timestamp: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
      actor: 'jane.smith@example.com',
      action: 'user.login',
      target: 'jane.smith@example.com',
      target_type: 'user',
      ip_address: '192.168.1.51',
      user_agent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36',
      status: 'success',
      details: 'User logged in',
      session_id: 'sess_def456'
    },
    {
      id: '3',
      timestamp: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      actor: 'mike.wilson@example.com',
      action: 'script.execute',
      target: 'data-processing-script',
      target_type: 'script',
      ip_address: '192.168.1.52',
      user_agent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36',
      status: 'failure',
      details: 'Script execution failed: Permission denied',
      session_id: 'sess_ghi789'
    },
    {
      id: '4',
      timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
      actor: 'admin@example.com',
      action: 'user.create',
      target: 'new.user@example.com',
      target_type: 'user',
      ip_address: '192.168.1.1',
      user_agent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      status: 'success',
      details: 'New user account created',
      session_id: 'sess_jkl012'
    },
    {
      id: '5',
      timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
      actor: 'system',
      action: 'agent.heartbeat',
      target: 'agent-002',
      target_type: 'agent',
      ip_address: '192.168.1.101',
      user_agent: 'UltaAI-Agent/2.1.0',
      status: 'warning',
      details: 'Agent heartbeat delayed',
      session_id: 'sess_mno345'
    }
  ];

  // Apply search filter
  let filteredLogs = mockLogs;
  if (state.search) {
    const searchLower = state.search.toLowerCase();
    filteredLogs = mockLogs.filter(log => 
      log.actor.toLowerCase().includes(searchLower) ||
      log.action.toLowerCase().includes(searchLower) ||
      log.target.toLowerCase().includes(searchLower) ||
      log.details.toLowerCase().includes(searchLower)
    );
  }

  // Apply status filter
  if (state.filters.status) {
    filteredLogs = filteredLogs.filter(log => log.status === state.filters.status);
  }

  // Apply action filter
  if (state.filters.action) {
    filteredLogs = filteredLogs.filter(log => log.action.includes(state.filters.action));
  }

  const totalCount = filteredLogs.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const paginatedData = filteredLogs.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    totalCount,
    page: state.page,
    pageSize: state.pageSize,
    totalPages: Math.ceil(totalCount / state.pageSize)
  };
};

export function EnhancedAuditTable({
  onViewDetails,
  onExportLogs
}: EnhancedAuditTableProps) {
  const [selectedRows, setSelectedRows] = useState<AuditLog[]>([]);

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
    updateSort,
    updatePage,
    updatePageSize,
  } = useServerTable({
    queryKey: ['audit-logs'],
    queryFn: fetchAuditLogs,
    initialPageSize: 50
  });

  const columns: EnhancedTableColumn<AuditLog>[] = [
    createSelectionColumn<AuditLog>(),
    createDateColumn<AuditLog>('timestamp', 'Time'),
    createTextColumn<AuditLog>('actor', 'Actor'),
    {
      key: 'action',
      label: 'Action',
      sortable: true,
      filterable: true,
      render: (log) => (
        <Badge variant="outline" className="font-mono text-xs">
          {log.action}
        </Badge>
      )
    },
    createTextColumn<AuditLog>('target', 'Target'),
    createTextColumn<AuditLog>('target_type', 'Type'),
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      filterable: true,
      render: (log) => {
        const variants = {
          success: 'default',
          failure: 'destructive',
          warning: 'secondary'
        };
        return (
          <Badge variant={variants[log.status] as any}>
            {log.status}
          </Badge>
        );
      }
    },
    createTextColumn<AuditLog>('ip_address', 'IP'),
    {
      key: 'details',
      label: 'Details',
      render: (log) => (
        <span className="text-sm text-muted-foreground line-clamp-1">
          {log.details}
        </span>
      )
    },
    createActionsColumn<AuditLog>([
      {
        label: 'View Details',
        onClick: (log) => onViewDetails?.(log)
      },
      {
        label: 'Export',
        onClick: (log) => onExportLogs?.([log])
      }
    ])
  ];

  const bulkActions: BulkAction<AuditLog>[] = [
    {
      id: 'export',
      label: 'Export Selected',
      icon: Download,
      action: async (logs) => {
        onExportLogs?.(logs);
      }
    },
    {
      id: 'view-details',
      label: 'View Details',
      icon: FileText,
      action: async (logs) => {
        if (logs.length === 1) {
          onViewDetails?.(logs[0]);
        }
      }
    }
  ];

  const handleRowSelect = (row: AuditLog, selected: boolean) => {
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
      onSearchChange={updateSearch}
      onSortChange={updateSort}
      onPageChange={updatePage}
      onPageSizeChange={updatePageSize}
      onRowSelect={handleRowSelect}
      onSelectAll={handleSelectAll}
      onRowClick={onViewDetails}
      emptyMessage="No audit logs found. Try adjusting your search criteria."
    />
  );
}