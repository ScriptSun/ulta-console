import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, ArrowUpDown } from 'lucide-react';
import { EnhancedTableColumn } from '@/types/tableTypes';
import { formatDistanceToNow } from 'date-fns';

export function createSelectionColumn<T>(): EnhancedTableColumn<T> {
  return {
    key: 'select',
    label: '',
    width: 50,
    render: () => <Checkbox />
  };
}

export function createStatusColumn<T>(
  accessor: keyof T,
  statusConfig: Record<string, { variant: string; label: string }>
): EnhancedTableColumn<T> {
  return {
    key: accessor as string,
    label: 'Status',
    sortable: true,
    filterable: true,
    render: (item: T) => {
      const status = item[accessor] as string;
      const config = statusConfig[status] || { variant: 'secondary', label: status };
      return (
        <Badge variant={config.variant as any}>
          {config.label}
        </Badge>
      );
    }
  };
}

export function createDateColumn<T>(
  accessor: keyof T,
  label: string
): EnhancedTableColumn<T> {
  return {
    key: accessor as string,
    label,
    sortable: true,
    render: (item: T) => {
      const date = item[accessor] as string | Date;
      if (!date) return '-';
      return formatDistanceToNow(new Date(date), { addSuffix: true });
    }
  };
}

export function createTextColumn<T>(
  accessor: keyof T,
  label: string,
  options?: { sortable?: boolean; filterable?: boolean }
): EnhancedTableColumn<T> {
  return {
    key: accessor as string,
    label,
    sortable: options?.sortable ?? true,
    filterable: options?.filterable ?? true,
    render: (item: T) => String(item[accessor] || '-')
  };
}

export function createActionsColumn<T>(
  actions: Array<{
    label: string;
    onClick: (item: T) => void;
    variant?: 'default' | 'destructive';
  }>
): EnhancedTableColumn<T> {
  return {
    key: 'actions',
    label: '',
    width: 50,
    render: (item: T) => (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="sm">
            <MoreHorizontal className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          {actions.map((action, index) => (
            <DropdownMenuItem
              key={index}
              onClick={() => action.onClick(item)}
              className={action.variant === 'destructive' ? 'text-destructive' : ''}
            >
              {action.label}
            </DropdownMenuItem>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    )
  };
}

export function createSortableHeader(
  label: string,
  sortBy?: string,
  sortOrder?: 'asc' | 'desc',
  onSort?: (sortBy: string, sortOrder: 'asc' | 'desc') => void
) {
  const columnKey = label.toLowerCase().replace(' ', '_');
  const isActive = sortBy === columnKey;
  
  return (
    <Button
      variant="ghost"
      onClick={() => {
        if (onSort) {
          const newOrder = isActive && sortOrder === 'asc' ? 'desc' : 'asc';
          onSort(columnKey, newOrder);
        }
      }}
      className="h-auto p-0 font-semibold"
    >
      {label}
      <ArrowUpDown className={`ml-2 h-4 w-4 ${isActive ? 'text-primary' : ''}`} />
    </Button>
  );
}