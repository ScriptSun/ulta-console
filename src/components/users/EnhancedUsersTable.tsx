import { useState } from 'react';
import { Eye, Edit, Trash2, Mail, Calendar } from 'lucide-react';
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

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  agent_count?: number;
}

interface EnhancedUsersTableProps {
  onUserClick?: (user: User) => void;
  onUserEdit?: (user: User) => void;
  onUserDelete?: (user: User) => void;
  onViewProfile?: (user: User) => void;
}

// Mock data fetch function - replace with actual API call
const fetchUsers = async (state: ServerTableState): Promise<ServerTableResponse<User>> => {
  console.log('Fetching users with state:', state);
  await new Promise(resolve => setTimeout(resolve, 400));
  
  const mockUsers: User[] = [
    {
      id: '1',
      email: 'john.doe@example.com',
      full_name: 'John Doe',
      created_at: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      agent_count: 3
    },
    {
      id: '2',
      email: 'jane.smith@example.com',
      full_name: 'Jane Smith',
      created_at: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
      agent_count: 7
    },
    {
      id: '3',
      email: 'mike.wilson@example.com',
      full_name: 'Mike Wilson',
      created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      agent_count: 0
    },
    {
      id: '4',
      email: 'sarah.connor@example.com',
      full_name: 'Sarah Connor',
      created_at: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
      agent_count: 12
    },
    {
      id: '5',
      email: 'alex.turner@example.com',
      full_name: null,
      created_at: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString(),
      agent_count: 1
    },
    {
      id: '6',
      email: 'emma.watson@example.com',
      full_name: 'Emma Watson',
      created_at: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
      updated_at: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString(),
      agent_count: 25
    }
  ];

  // Apply search filter
  let filteredUsers = mockUsers;
  if (state.search) {
    const searchLower = state.search.toLowerCase();
    filteredUsers = mockUsers.filter(user => 
      user.email.toLowerCase().includes(searchLower) ||
      user.full_name?.toLowerCase().includes(searchLower) ||
      user.id.toLowerCase().includes(searchLower)
    );
  }

  // Apply filters
  if (state.filters.agent_count) {
    filteredUsers = filteredUsers.filter(user => {
      switch (state.filters.agent_count) {
        case 'none': return user.agent_count === 0;
        case 'low': return user.agent_count! >= 1 && user.agent_count! <= 5;
        case 'medium': return user.agent_count! >= 6 && user.agent_count! <= 20;
        case 'high': return user.agent_count! > 20;
        default: return true;
      }
    });
  }
  
  if (state.filters.date_range) {
    const now = new Date();
    let filterDate = new Date();
    
    switch (state.filters.date_range) {
      case 'today':
        filterDate.setHours(0, 0, 0, 0);
        filteredUsers = filteredUsers.filter(user => new Date(user.created_at) >= filterDate);
        break;
      case 'week':
        filterDate.setDate(now.getDate() - 7);
        filteredUsers = filteredUsers.filter(user => new Date(user.created_at) >= filterDate);
        break;
      case 'month':
        filterDate.setMonth(now.getMonth() - 1);
        filteredUsers = filteredUsers.filter(user => new Date(user.created_at) >= filterDate);
        break;
    }
  }

  // Apply sorting
  if (state.sortBy) {
    filteredUsers = filteredUsers.sort((a, b) => {
      let aValue = (a as any)[state.sortBy!];
      let bValue = (b as any)[state.sortBy!];
      
      if (state.sortBy === 'created_at' || state.sortBy === 'updated_at') {
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

  const totalCount = filteredUsers.length;
  const startIndex = (state.page - 1) * state.pageSize;
  const endIndex = startIndex + state.pageSize;
  const paginatedData = filteredUsers.slice(startIndex, endIndex);

  return {
    data: paginatedData,
    totalCount,
    page: state.page,
    pageSize: state.pageSize,
    totalPages: Math.ceil(totalCount / state.pageSize)
  };
};

export function EnhancedUsersTable({
  onUserClick,
  onUserEdit,
  onUserDelete,
  onViewProfile
}: EnhancedUsersTableProps) {
  const [selectedRows, setSelectedRows] = useState<User[]>([]);

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
    queryKey: ['users'],
    queryFn: fetchUsers,
    initialPageSize: 25
  });

  const columns: EnhancedTableColumn<User>[] = [
    createSelectionColumn<User>(),
    {
      key: 'id',
      label: 'User ID',
      sortable: true,
      render: (user) => (
        <code 
          className="text-xs bg-primary/10 text-primary px-2 py-1 rounded font-mono cursor-pointer hover:bg-primary/20 transition-colors"
          onClick={() => onViewProfile?.(user)}
          title="Click to view user profile"
        >
          {user.id.slice(0, 8)}...
        </code>
      )
    },
    {
      key: 'email',
      label: 'Email',
      sortable: true,
      render: (user) => (
        <div className="flex items-center gap-1">
          <Mail className="h-3 w-3 text-muted-foreground" />
          <span className="text-sm">{user.email}</span>
        </div>
      )
    },
    {
      key: 'full_name',
      label: 'Full Name',
      sortable: true,
      render: (user) => (
        <div className="font-medium">{user.full_name || 'Unnamed User'}</div>
      )
    },
    {
      key: 'agent_count',
      label: 'Agents',
      sortable: true,
      render: (user) => (
        <Badge variant={user.agent_count === 0 ? 'secondary' : 'default'}>
          {user.agent_count} agent{user.agent_count !== 1 ? 's' : ''}
        </Badge>
      )
    },
    createDateColumn<User>('created_at', 'Created'),
    createActionsColumn<User>([
      {
        label: 'View Profile',
        onClick: (user) => onViewProfile?.(user)
      },
      {
        label: 'Edit User',
        onClick: (user) => onUserEdit?.(user)
      },
      {
        label: 'Delete User',
        onClick: (user) => onUserDelete?.(user),
        variant: 'destructive'
      }
    ])
  ];

  const bulkActions: BulkAction<User>[] = [
    {
      id: 'delete',
      label: 'Delete Selected',
      icon: Trash2,
      variant: 'destructive',
      action: async (users) => {
        console.log('Deleting users:', users.map(u => u.id));
      }
    }
  ];

  const handleRowSelect = (row: User, selected: boolean) => {
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
      key: 'agent_count',
      label: 'Agent Count',
      options: [
        { value: 'none', label: 'No Agents' },
        { value: 'low', label: '1-5 Agents' },
        { value: 'medium', label: '6-20 Agents' },
        { value: 'high', label: '20+ Agents' }
      ]
    },
    {
      key: 'date_range',
      label: 'Created',
      options: [
        { value: 'today', label: 'Today' },
        { value: 'week', label: 'Past Week' },
        { value: 'month', label: 'Past Month' }
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
      onRowClick={onUserClick}
      onFilterChange={handleFilterChange}
      emptyMessage="No users found. Try adjusting your search criteria."
    />
  );
}