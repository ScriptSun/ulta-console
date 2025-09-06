import { useState } from 'react';
import { Play, Pause, Square, Trash2, Eye, Activity } from 'lucide-react';
import { EnhancedDataTable } from '@/components/ui/enhanced-data-table';
import { useServerTable } from '@/hooks/useServerTable';
import { 
  createSelectionColumn,
  createStatusColumn,
  createTextColumn,
  createDateColumn,
  createActionsColumn
} from '@/lib/columnDefinitions';
import { EnhancedTableColumn, BulkAction } from '@/types/tableTypes';
import { ServerTableState, ServerTableResponse } from '@/types/tableTypes';

interface Agent {
  id: string;
  hostname: string;
  agent_type: string;
  region: string;
  ip_address: string;
  status: 'active' | 'inactive' | 'suspended' | 'error';
  os: string;
  version: string;
  last_seen: string;
  tasks_completed: number;
  cpu_usage: number;
  memory_usage: number;
  user_name?: string;
  plan_name?: string;
}

interface EnhancedAgentsTableProps {
  onAgentClick?: (agent: Agent) => void;
  onAgentStart?: (agent: Agent) => void;
  onAgentPause?: (agent: Agent) => void;
  onAgentStop?: (agent: Agent) => void;
  onAgentDelete?: (agent: Agent) => void;
  onViewLogs?: (agent: Agent) => void;
  onViewDetails?: (agent: Agent) => void;
}

// Mock data fetch function - replace with actual API call
const fetchAgents = async (state: ServerTableState): Promise<ServerTableResponse<Agent>> => {
  // Simulate API delay
  await new Promise(resolve => setTimeout(resolve, 500));
  
  const mockAgents: Agent[] = [
    {
      id: '1',
      hostname: 'agent-001',
      agent_type: 'web-scraper',
      region: 'us-east-1',
      ip_address: '192.168.1.100',
      status: 'active',
      os: 'Ubuntu 20.04',
      version: '2.1.0',
      last_seen: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      tasks_completed: 1250,
      cpu_usage: 45,
      memory_usage: 2.1,
      user_name: 'john.doe',
      plan_name: 'Pro'
    },
    {
      id: '2',
      hostname: 'agent-002',
      agent_type: 'data-processor',
      region: 'us-west-2',
      ip_address: '192.168.1.101',
      status: 'inactive',
      os: 'CentOS 8',
      version: '2.0.5',
      last_seen: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      tasks_completed: 875,
      cpu_usage: 12,
      memory_usage: 1.8,
      user_name: 'jane.smith',
      plan_name: 'Enterprise'
    },
    {
      id: '3',
      hostname: 'agent-003',
      agent_type: 'api-monitor',
      region: 'eu-west-1',
      ip_address: '192.168.1.102',
      status: 'error',
      os: 'Windows Server 2019',
      version: '2.1.0',
      last_seen: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      tasks_completed: 542,
      cpu_usage: 89,
      memory_usage: 3.2,
      user_name: 'mike.wilson',
      plan_name: 'Basic'
    },
    {
      id: '4',
      hostname: 'agent-004',
      agent_type: 'web-scraper',
      region: 'us-east-1',
      ip_address: '192.168.1.103',
      status: 'active',
      os: 'Ubuntu 20.04',
      version: '2.1.0',
      last_seen: new Date(Date.now() - 1 * 60 * 1000).toISOString(),
      tasks_completed: 2100,
      cpu_usage: 32,
      memory_usage: 1.9,
      user_name: 'sarah.connor',
      plan_name: 'Pro'
    },
    {
      id: '5',
      hostname: 'agent-005',
      agent_type: 'data-processor',
      region: 'eu-west-1',
      ip_address: '192.168.1.104',
      status: 'suspended',
      os: 'CentOS 8',
      version: '2.0.5',
      last_seen: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      tasks_completed: 300,
      cpu_usage: 5,
      memory_usage: 0.8,
      user_name: 'alex.turner',
      plan_name: 'Basic'
    },
    {
      id: '6',
      hostname: 'agent-006',
      agent_type: 'api-monitor',
      region: 'us-west-2',
      ip_address: '192.168.1.105',
      status: 'active',
      os: 'Windows Server 2019',
      version: '2.1.0',
      last_seen: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      tasks_completed: 1850,
      cpu_usage: 67,
      memory_usage: 2.8,
      user_name: 'emma.watson',
      plan_name: 'Enterprise'
    },
    {
      id: '7',
      hostname: 'agent-007',
      agent_type: 'web-scraper',
      region: 'eu-west-1',
      ip_address: '192.168.1.106',
      status: 'inactive',
      os: 'Ubuntu 20.04',
      version: '2.0.5',
      last_seen: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      tasks_completed: 750,
      cpu_usage: 8,
      memory_usage: 0.5,
      user_name: 'david.clark',
      plan_name: 'Pro'
    },
    {
      id: '8',
      hostname: 'agent-008',
      agent_type: 'data-processor',
      region: 'us-east-1',
      ip_address: '192.168.1.107',
      status: 'error',
      os: 'Windows Server 2019',
      version: '2.1.0',
      last_seen: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      tasks_completed: 425,
      cpu_usage: 95,
      memory_usage: 3.5,
      user_name: 'lisa.parker',
      plan_name: 'Enterprise'
    }
  ];

  // Apply search filter
  let filteredAgents = mockAgents;
  if (state.search) {
    const searchLower = state.search.toLowerCase();
    filteredAgents = mockAgents.filter(agent => 
      agent.hostname.toLowerCase().includes(searchLower) ||
      agent.agent_type.toLowerCase().includes(searchLower) ||
      agent.region.toLowerCase().includes(searchLower) ||
      agent.ip_address.includes(searchLower) ||
      agent.user_name?.toLowerCase().includes(searchLower)
    );
  }

  // Apply filters
  if (state.filters.status) {
    filteredAgents = filteredAgents.filter(agent => agent.status === state.filters.status);
  }
  
  if (state.filters.region) {
    filteredAgents = filteredAgents.filter(agent => agent.region === state.filters.region);
  }
  
  if (state.filters.os) {
    filteredAgents = filteredAgents.filter(agent => agent.os === state.filters.os);
  }
  
  if (state.filters.agent_type) {
    filteredAgents = filteredAgents.filter(agent => agent.agent_type === state.filters.agent_type);
  }

  // Apply sorting
  if (state.sortBy) {
    filteredAgents = filteredAgents.sort((a, b) => {
      const aValue = (a as any)[state.sortBy!];
      const bValue = (b as any)[state.sortBy!];
      
      if (aValue < bValue) return state.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return state.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });
  }

  const totalCount = filteredAgents.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const paginatedData = filteredAgents.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    totalCount,
    page: state.page,
    pageSize: state.pageSize,
    totalPages: Math.ceil(totalCount / state.pageSize)
  };
};

export function EnhancedAgentsTable({
  onAgentClick,
  onAgentStart,
  onAgentPause,
  onAgentStop,
  onAgentDelete,
  onViewLogs,
  onViewDetails
}: EnhancedAgentsTableProps) {
  const [selectedRows, setSelectedRows] = useState<Agent[]>([]);

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
    queryKey: ['agents'],
    queryFn: fetchAgents,
    initialPageSize: 25
  });

  const columns: EnhancedTableColumn<Agent>[] = [
    createSelectionColumn<Agent>(),
    createTextColumn<Agent>('hostname', 'Hostname'),
    createTextColumn<Agent>('agent_type', 'Type'),
    createTextColumn<Agent>('user_name', 'User'),
    createTextColumn<Agent>('plan_name', 'Plan'),
    createTextColumn<Agent>('region', 'Region'),
    createTextColumn<Agent>('ip_address', 'IP Address'),
    createStatusColumn<Agent>('status', {
      active: { variant: 'default', label: 'Active' },
      inactive: { variant: 'secondary', label: 'Inactive' },
      suspended: { variant: 'outline', label: 'Suspended' },
      error: { variant: 'destructive', label: 'Error' }
    }),
    createTextColumn<Agent>('os', 'OS'),
    createTextColumn<Agent>('version', 'Version'),
    createDateColumn<Agent>('last_seen', 'Last Seen'),
    {
      key: 'tasks_completed',
      label: 'Tasks',
      sortable: true,
      render: (agent) => agent.tasks_completed.toLocaleString()
    },
    createActionsColumn<Agent>([
      {
        label: 'Start',
        onClick: (agent) => onAgentStart?.(agent)
      },
      {
        label: 'Pause',
        onClick: (agent) => onAgentPause?.(agent)
      },
      {
        label: 'Stop',
        onClick: (agent) => onAgentStop?.(agent)
      },
      {
        label: 'View Logs',
        onClick: (agent) => onViewLogs?.(agent)
      },
      {
        label: 'View Details',
        onClick: (agent) => onViewDetails?.(agent)
      },
      {
        label: 'Delete',
        onClick: (agent) => onAgentDelete?.(agent),
        variant: 'destructive'
      }
    ])
  ];

  const bulkActions: BulkAction<Agent>[] = [
    {
      id: 'start',
      label: 'Start Selected',
      icon: Play,
      action: async (agents) => {
        console.log('Starting agents:', agents.map(a => a.id));
      }
    },
    {
      id: 'pause',
      label: 'Pause Selected',
      icon: Pause,
      action: async (agents) => {
        console.log('Pausing agents:', agents.map(a => a.id));
      }
    },
    {
      id: 'stop',
      label: 'Stop Selected',
      icon: Square,
      action: async (agents) => {
        console.log('Stopping agents:', agents.map(a => a.id));
      }
    },
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: Trash2,
      variant: 'destructive',
      action: async (agents) => {
        console.log('Deleting agents:', agents.map(a => a.id));
      }
    }
  ];

  const handleRowSelect = (row: Agent, selected: boolean) => {
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
    if (value === '') {
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
        { value: 'suspended', label: 'Suspended' },
        { value: 'error', label: 'Error' }
      ]
    },
    {
      key: 'region',
      label: 'Region',
      options: [
        { value: 'us-east-1', label: 'US East 1' },
        { value: 'us-west-2', label: 'US West 2' },
        { value: 'eu-west-1', label: 'EU West 1' }
      ]
    },
    {
      key: 'os',
      label: 'OS',
      options: [
        { value: 'Ubuntu 20.04', label: 'Ubuntu 20.04' },
        { value: 'CentOS 8', label: 'CentOS 8' },
        { value: 'Windows Server 2019', label: 'Windows Server 2019' }
      ]
    },
    {
      key: 'agent_type',
      label: 'Type',
      options: [
        { value: 'web-scraper', label: 'Web Scraper' },
        { value: 'data-processor', label: 'Data Processor' },
        { value: 'api-monitor', label: 'API Monitor' }
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
      onRowClick={onAgentClick}
      onFilterChange={handleFilterChange}
      emptyMessage="No agents found. Try adjusting your search criteria."
    />
  );
}