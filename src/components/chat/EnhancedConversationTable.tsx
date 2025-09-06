import { useState } from 'react';
import { Eye, MessageSquare, Bot, User } from 'lucide-react';
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
import { Link } from 'react-router-dom';

interface Conversation {
  id: string;
  tenant_id: string;
  user_id: string | null;
  agent_id: string;
  session_id: string | null;
  source: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  last_intent: string | null;
  last_action: string | null;
  meta: any;
  created_at: string;
  updated_at: string;
  agents?: {
    id: string;
    hostname: string | null;
    status: string;
    version: string | null;
  };
  _count?: {
    chat_messages: number;
    chat_events: number;
  };
}

interface EnhancedConversationTableProps {
  onConversationClick?: (conversation: Conversation) => void;
  onViewDetails?: (conversation: Conversation) => void;
}

// Mock data fetch function - replace with actual API call
const fetchConversations = async (state: ServerTableState): Promise<ServerTableResponse<Conversation>> => {
  console.log('Fetching conversations with state:', state);
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const mockConversations: Conversation[] = [
    {
      id: '1',
      tenant_id: 'tenant-1',
      user_id: 'user-123',
      agent_id: 'agent-001',
      session_id: 'session-abc',
      source: 'website',
      started_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      closed_at: null,
      status: 'open',
      last_intent: 'billing_inquiry',
      last_action: 'escalate_to_human',
      meta: {},
      created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      agents: {
        id: 'agent-001',
        hostname: 'chat-bot-001',
        status: 'active',
        version: '2.1.0'
      },
      _count: {
        chat_messages: 15,
        chat_events: 3
      }
    },
    {
      id: '2',
      tenant_id: 'tenant-1',
      user_id: null,
      agent_id: 'agent-002',
      session_id: 'session-def',
      source: 'widget',
      started_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      closed_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'closed',
      last_intent: 'product_info',
      last_action: 'provide_documentation',
      meta: {},
      created_at: new Date(Date.now() - 4 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      agents: {
        id: 'agent-002',
        hostname: 'support-bot-002',
        status: 'active',
        version: '2.0.5'
      },
      _count: {
        chat_messages: 8,
        chat_events: 2
      }
    },
    {
      id: '3',
      tenant_id: 'tenant-1',
      user_id: 'user-456',
      agent_id: 'agent-003',
      session_id: 'session-ghi',
      source: 'api',
      started_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      closed_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      status: 'closed',
      last_intent: 'technical_support',
      last_action: 'resolve_issue',
      meta: {},
      created_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      agents: {
        id: 'agent-003',
        hostname: 'tech-support-003',
        status: 'inactive',
        version: '2.1.0'
      },
      _count: {
        chat_messages: 25,
        chat_events: 7
      }
    },
    {
      id: '4',
      tenant_id: 'tenant-1',
      user_id: 'user-789',
      agent_id: 'agent-001',
      session_id: 'session-jkl',
      source: 'mobile',
      started_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      closed_at: null,
      status: 'open',
      last_intent: 'order_status',
      last_action: 'fetch_order_details',
      meta: {},
      created_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
      agents: {
        id: 'agent-001',
        hostname: 'chat-bot-001',
        status: 'active',
        version: '2.1.0'
      },
      _count: {
        chat_messages: 12,
        chat_events: 1
      }
    }
  ];

  // Apply search filter
  let filteredConversations = mockConversations;
  if (state.search) {
    const searchLower = state.search.toLowerCase();
    filteredConversations = mockConversations.filter(conv => 
      conv.agents?.hostname?.toLowerCase().includes(searchLower) ||
      conv.session_id?.toLowerCase().includes(searchLower) ||
      conv.last_intent?.toLowerCase().includes(searchLower) ||
      conv.user_id?.toLowerCase().includes(searchLower) ||
      conv.source.toLowerCase().includes(searchLower)
    );
  }

  // Apply filters
  if (state.filters.status) {
    filteredConversations = filteredConversations.filter(conv => conv.status === state.filters.status);
  }
  
  if (state.filters.source) {
    filteredConversations = filteredConversations.filter(conv => conv.source === state.filters.source);
  }
  
  if (state.filters.agent_status) {
    filteredConversations = filteredConversations.filter(conv => conv.agents?.status === state.filters.agent_status);
  }

  // Apply sorting
  if (state.sortBy) {
    filteredConversations = filteredConversations.sort((a, b) => {
      let aValue = (a as any)[state.sortBy!];
      let bValue = (b as any)[state.sortBy!];
      
      if (state.sortBy === 'started_at' || state.sortBy === 'closed_at') {
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

  const totalCount = filteredConversations.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const paginatedData = filteredConversations.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    totalCount,
    page: state.page,
    pageSize: state.pageSize,
    totalPages: Math.ceil(totalCount / state.pageSize)
  };
};

export function EnhancedConversationTable({
  onConversationClick,
  onViewDetails
}: EnhancedConversationTableProps) {
  const [selectedRows, setSelectedRows] = useState<Conversation[]>([]);

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
    queryKey: ['conversations'],
    queryFn: fetchConversations,
    initialPageSize: 25
  });

  const columns: EnhancedTableColumn<Conversation>[] = [
    createSelectionColumn<Conversation>(),
    createDateColumn<Conversation>('started_at', 'Started'),
    {
      key: 'agent',
      label: 'Agent',
      sortable: false,
      render: (conv) => (
        <div className="flex items-center gap-2">
          <Link
            to={`/agents/${conv.agent_id}`}
            className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <Bot className="h-3 w-3" />
            {conv.agents?.hostname || `Agent-${conv.agent_id.slice(0, 8)}`}
          </Link>
          <Badge 
            variant={conv.agents?.status === 'active' ? 'default' : 'secondary'}
            className="text-xs"
          >
            {conv.agents?.status}
          </Badge>
        </div>
      )
    },
    {
      key: 'user_id',
      label: 'User',
      sortable: true,
      render: (conv) => (
        <div className="text-sm">
          {conv.user_id ? (
            <Badge variant="outline" className="text-xs">
              {conv.user_id.slice(0, 8)}
            </Badge>
          ) : (
            <span className="text-muted-foreground">Anonymous</span>
          )}
        </div>
      )
    },
    {
      key: 'last_intent',
      label: 'Last Intent',
      sortable: true,
      render: (conv) => (
        conv.last_intent ? (
          <Badge variant="outline" className="text-xs">
            {conv.last_intent.replace('_', ' ')}
          </Badge>
        ) : null
      )
    },
    {
      key: 'source',
      label: 'Source',
      sortable: true,
      render: (conv) => {
        const colors: Record<string, string> = {
          website: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          widget: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          api: "bg-primary/10 text-primary dark:bg-primary/20",
          mobile: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        };
        
        return (
          <Badge className={colors[conv.source] || "bg-muted/20 text-muted-foreground border border-border"}>
            {conv.source}
          </Badge>
        );
      }
    },
    {
      key: 'messages',
      label: 'Messages',
      sortable: false,
      render: (conv) => (
        <Badge variant="outline" className="text-xs">
          {conv._count?.chat_messages || 0}
        </Badge>
      )
    },
    {
      key: 'status',
      label: 'Status',
      sortable: true,
      render: (conv) => {
        const statusConfig = {
          open: { 
            variant: 'default' as const,
            className: 'bg-success/10 text-success border-success/20',
            dot: 'bg-success'
          },
          closed: { 
            variant: 'secondary' as const,
            className: 'bg-muted/50 text-muted-foreground border-muted/20',
            dot: 'bg-muted-foreground'
          },
        };

        const config = statusConfig[conv.status as keyof typeof statusConfig] || {
          variant: 'outline' as const,
          className: '',
          dot: 'bg-muted-foreground'
        };
        
        return (
          <Badge variant={config.variant} className={`${config.className} gap-1.5 font-medium`}>
            <div className={`w-2 h-2 rounded-full ${config.dot}`} />
            <span>{conv.status}</span>
          </Badge>
        );
      }
    },
    createActionsColumn<Conversation>([
      {
        label: 'View Details',
        onClick: (conv) => onViewDetails?.(conv)
      },
      {
        label: 'View Agent',
        onClick: (conv) => window.open(`/agents/${conv.agent_id}`, '_blank')
      }
    ])
  ];

  const bulkActions: BulkAction<Conversation>[] = [
    {
      id: 'export',
      label: 'Export Selected',
      icon: MessageSquare,
      action: async (conversations) => {
        console.log('Exporting conversations:', conversations.map(c => c.id));
      }
    }
  ];

  const handleRowSelect = (row: Conversation, selected: boolean) => {
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
        { value: 'open', label: 'Open' },
        { value: 'closed', label: 'Closed' }
      ]
    },
    {
      key: 'source',
      label: 'Source',
      options: [
        { value: 'website', label: 'Website' },
        { value: 'widget', label: 'Widget' },
        { value: 'api', label: 'API' },
        { value: 'mobile', label: 'Mobile' }
      ]
    },
    {
      key: 'agent_status',
      label: 'Agent Status',
      options: [
        { value: 'active', label: 'Active' },
        { value: 'inactive', label: 'Inactive' }
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
      onRowClick={onConversationClick}
      onFilterChange={handleFilterChange}
      emptyMessage="No conversations found. Try adjusting your search criteria."
    />
  );
}