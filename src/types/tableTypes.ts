export interface ServerTableState {
  page: number;
  pageSize: number;
  search: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  filters: Record<string, any>;
}

export interface ServerTableResponse<T> {
  data: T[];
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface TableFilter {
  key: string;
  label: string;
  type: 'text' | 'select' | 'date' | 'daterange';
  options?: { label: string; value: string }[];
}

export interface BulkAction<T> {
  id: string;
  label: string;
  icon?: React.ComponentType<any>;
  action: (selectedRows: T[]) => Promise<void>;
  variant?: 'default' | 'destructive';
}

export interface EnhancedTableColumn<T> {
  key: string;
  label: string;
  sortable?: boolean;
  filterable?: boolean;
  width?: number;
  render?: (item: T) => React.ReactNode;
}