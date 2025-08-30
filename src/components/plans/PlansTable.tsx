import { useState } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { 
  MoreHorizontal, 
  Edit, 
  Copy, 
  Trash2, 
  Power, 
  PowerOff 
} from 'lucide-react';
import { Plan } from '@/types/planTypes';
import { cn } from '@/lib/utils';

interface PlansTableProps {
  plans: Plan[];
  onEdit: (plan: Plan) => void;
  onDuplicate: (plan: Plan) => void;
  onToggleStatus: (plan: Plan) => void;
  onDelete: (plan: Plan) => void;
}

export function PlansTable({ 
  plans, 
  onEdit, 
  onDuplicate, 
  onToggleStatus, 
  onDelete 
}: PlansTableProps) {
  const [sortBy, setSortBy] = useState<keyof Plan>('updatedAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (column: keyof Plan) => {
    if (sortBy === column) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
  };

  const sortedPlans = [...plans].sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (aValue < bValue) return sortOrder === 'asc' ? -1 : 1;
    if (aValue > bValue) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const formatBillingIntervals = (intervals: string[]) => {
    const labels = {
      monthly: 'M',
      annual: 'A',
      '36m': '36M'
    };
    return intervals.map(interval => labels[interval as keyof typeof labels]).join(', ');
  };

  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No plans configured</p>
        <p className="text-sm">Create your first plan to get started</p>
      </div>
    );
  }

  return (
    <div className="border rounded-lg bg-card">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead 
              className="cursor-pointer hover:text-foreground"
              onClick={() => handleSort('name')}
            >
              Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Version</TableHead>
            <TableHead>Limits</TableHead>
            <TableHead>Intervals</TableHead>
            <TableHead>Support</TableHead>
            <TableHead 
              className="cursor-pointer hover:text-foreground"
              onClick={() => handleSort('updatedAt')}
            >
              Updated {sortBy === 'updatedAt' && (sortOrder === 'asc' ? '↑' : '↓')}
            </TableHead>
            <TableHead className="w-[50px]"></TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedPlans.map((plan) => (
            <TableRow key={plan.id} className="hover:bg-muted/50">
              <TableCell>
                <div>
                  <div className="font-medium">{plan.name}</div>
                  <div className="text-sm text-muted-foreground">{plan.slug}</div>
                  {plan.description && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {plan.description}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <Badge 
                  variant={plan.enabled ? 'default' : 'secondary'}
                  className={cn(
                    plan.enabled 
                      ? 'bg-success/10 text-success border-success/20' 
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {plan.enabled ? 'Active' : 'Disabled'}
                </Badge>
              </TableCell>
              <TableCell>
                <Badge variant="outline" className="font-mono">
                  v{plan.version}
                </Badge>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>AI: {plan.limits.ai_requests.toLocaleString()}</div>
                  <div>Events: {plan.limits.server_events.toLocaleString()}</div>
                </div>
              </TableCell>
              <TableCell>
                <span className="text-sm font-mono">
                  {formatBillingIntervals(plan.allowedBillingIntervals)}
                </span>
              </TableCell>
              <TableCell>
                <span className="text-sm capitalize">{plan.supportLevel}</span>
              </TableCell>
              <TableCell>
                <span className="text-sm text-muted-foreground">
                  {new Date(plan.updatedAt).toLocaleDateString()}
                </span>
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-[160px]">
                    <DropdownMenuItem onClick={() => onEdit(plan)}>
                      <Edit className="h-4 w-4 mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(plan)}>
                      <Copy className="h-4 w-4 mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleStatus(plan)}>
                      {plan.enabled ? (
                        <>
                          <PowerOff className="h-4 w-4 mr-2" />
                          Disable
                        </>
                      ) : (
                        <>
                          <Power className="h-4 w-4 mr-2" />
                          Enable
                        </>
                      )}
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      onClick={() => onDelete(plan)}
                      className="text-destructive focus:text-destructive"
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}