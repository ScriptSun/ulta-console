import * as React from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue 
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  ChevronLeft, 
  ChevronRight, 
  Download,
  Search,
  AlertCircle,
  Inbox
} from 'lucide-react';
import { EnhancedTableColumn, BulkAction } from '@/types/tableTypes';
import { createSortableHeader } from '@/lib/columnDefinitions';

interface EnhancedDataTableProps<T> {
  data: T[];
  columns: EnhancedTableColumn<T>[];
  totalCount: number;
  currentPage: number;
  pageSize: number;
  totalPages: number;
  isLoading?: boolean;
  error?: Error | null;
  searchValue?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
  selectedRows?: T[];
  bulkActions?: BulkAction<T>[];
  filters?: Record<string, any>;
  filterOptions?: {
    key: string;
    label: string;
    options: { value: string; label: string }[];
  }[];
  onSearchChange?: (search: string) => void;
  onSortChange?: (sortBy: string, sortOrder: 'asc' | 'desc') => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onRowSelect?: (row: T, selected: boolean) => void;
  onSelectAll?: (selected: boolean) => void;
  onRowClick?: (row: T) => void;
  onFilterChange?: (key: string, value: string) => void;
  emptyMessage?: string;
}

export function EnhancedDataTable<T extends { id: string | number }>({
  data,
  columns,
  totalCount,
  currentPage,
  pageSize,
  totalPages,
  isLoading = false,
  error = null,
  searchValue = '',
  sortBy,
  sortOrder,
  selectedRows = [],
  bulkActions = [],
  filters = {},
  filterOptions = [],
  onSearchChange,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onRowSelect,
  onSelectAll,
  onRowClick,
  onFilterChange,
  emptyMessage = 'No data available'
}: EnhancedDataTableProps<T>) {
  const selectedIds = new Set(selectedRows.map(row => row.id));
  const hasSelection = columns.some(col => col.key === 'select');
  const allSelected = hasSelection && data.length > 0 && data.every(row => selectedIds.has(row.id));

  const handleSelectAll = () => {
    if (onSelectAll) {
      onSelectAll(!allSelected);
    }
  };

  const handleRowSelect = (row: T) => {
    if (onRowSelect) {
      const isSelected = selectedIds.has(row.id);
      onRowSelect(row, !isSelected);
    }
  };

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center py-12 text-center">
        <AlertCircle className="h-12 w-12 text-muted-foreground mb-4" />
        <h3 className="text-lg font-semibold">Something went wrong</h3>
        <p className="text-muted-foreground">
          {error.message || 'Failed to load data'}
        </p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          {onSearchChange && (
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search..."
                value={searchValue}
                onChange={(e) => onSearchChange(e.target.value)}
                className="pl-10 w-[300px]"
              />
            </div>
          )}
          
          {/* Filter Controls */}
          {filterOptions.map((filterOption) => (
            <Select
              key={filterOption.key}
              value={filters[filterOption.key] || 'all'}
              onValueChange={(value) => onFilterChange?.(filterOption.key, value === 'all' ? '' : value)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder={filterOption.label} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All {filterOption.label}</SelectItem>
                {filterOption.options.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ))}
        </div>

        <div className="flex items-center gap-2">
          {selectedRows.length > 0 && (
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {selectedRows.length} selected
              </Badge>
              {bulkActions.map((action) => (
                <Button
                  key={action.id}
                  size="sm"
                  variant={action.variant || 'default'}
                  onClick={() => action.action(selectedRows)}
                >
                  {action.icon && <action.icon className="h-4 w-4 mr-2" />}
                  {action.label}
                </Button>
              ))}
            </div>
          )}
          
          <Button variant="outline" size="sm">
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead 
                  key={column.key}
                  style={{ width: column.width }}
                >
                  {column.key === 'select' ? (
                    <Checkbox
                      checked={allSelected}
                      onCheckedChange={handleSelectAll}
                    />
                  ) : column.sortable && onSortChange ? (
                    createSortableHeader(
                      column.label,
                      sortBy,
                      sortOrder,
                      onSortChange,
                      column.key
                    )
                  ) : (
                    column.label
                  )}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: pageSize }).map((_, i) => (
                <TableRow key={i}>
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      <Skeleton className="h-4 w-full" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : data.length === 0 ? (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24">
                  <div className="flex flex-col items-center justify-center text-center">
                    <Inbox className="h-12 w-12 text-muted-foreground mb-4" />
                    <h3 className="font-semibold">No results found</h3>
                    <p className="text-sm text-muted-foreground">
                      {emptyMessage}
                    </p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data.map((row) => (
                <TableRow
                  key={row.id}
                  className={`cursor-pointer ${selectedIds.has(row.id) ? 'bg-muted/50' : ''}`}
                  onClick={() => onRowClick?.(row)}
                >
                  {columns.map((column) => (
                    <TableCell key={column.key}>
                      {column.key === 'select' ? (
                        <Checkbox
                          checked={selectedIds.has(row.id)}
                          onCheckedChange={() => handleRowSelect(row)}
                          onClick={(e) => e.stopPropagation()}
                        />
                      ) : column.render ? (
                        column.render(row)
                      ) : (
                        String((row as any)[column.key] || '-')
                      )}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <span>
            Showing {((currentPage - 1) * pageSize) + 1} to{' '}
            {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
          </span>
          <Select
            value={pageSize.toString()}
            onValueChange={(value) => onPageSizeChange?.(parseInt(value))}
          >
            <SelectTrigger className="w-[80px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="25">25</SelectItem>
              <SelectItem value="50">50</SelectItem>
              <SelectItem value="100">100</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage - 1)}
            disabled={currentPage === 1 || isLoading}
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>
          
          <div className="flex items-center gap-1">
            <span className="text-sm">
              Page {currentPage} of {totalPages}
            </span>
          </div>

          <Button
            variant="outline"
            size="sm"
            onClick={() => onPageChange?.(currentPage + 1)}
            disabled={currentPage === totalPages || isLoading}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}