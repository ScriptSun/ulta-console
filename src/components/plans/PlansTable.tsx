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
import { SubscriptionPlan, PlanUsageStats } from '@/hooks/useSubscriptionPlans';
import { cn } from '@/lib/utils';

interface PlansTableProps {
  plans: SubscriptionPlan[];
  planUsageStats: PlanUsageStats[];
  onEdit: (plan: SubscriptionPlan) => void;
  onDuplicate: (plan: SubscriptionPlan) => void;
  onToggleStatus: (plan: SubscriptionPlan) => void;
  onDelete: (plan: SubscriptionPlan) => void;
}

export function PlansTable({ 
  plans, 
  planUsageStats,
  onEdit, 
  onDuplicate, 
  onToggleStatus, 
  onDelete 
}: PlansTableProps) {
  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No plans configured</p>
        <p className="text-sm">Create your first plan to get started</p>
      </div>
    );
  }

  const getAgentCount = (planKey: string) => {
    const stats = planUsageStats.find(stat => stat.plan_key === planKey);
    return stats?.agent_count || 0;
  };

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan Keys</TableHead>
              <TableHead>Active Agents</TableHead>
              <TableHead>AI Limit</TableHead>
              <TableHead>Server Limit</TableHead>
              <TableHead>Monthly Price</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id} className="hover:bg-muted/50">
                <TableCell>
                  <div>
                    <div className="font-medium">{plan.name}</div>
                    {plan.description && (
                      <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {plan.description}
                      </div>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className="bg-primary/10 text-primary border-primary/20 dark:text-primary-foreground font-mono"
                  >
                    {plan.key}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {getAgentCount(plan.key).toLocaleString()}
                    </div>
                    <div className="text-xs text-muted-foreground">agents</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {plan.monthly_ai_requests.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {plan.monthly_server_events.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    ${plan.price_monthly.toFixed(2)}
                  </span>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant={plan.active ? 'default' : 'secondary'}
                    className={cn(
                      plan.active 
                        ? 'bg-success/10 text-success border-success/20' 
                        : 'bg-muted text-muted-foreground'
                    )}
                  >
                    {plan.active ? 'Active' : 'Disabled'}
                  </Badge>
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
                        {plan.active ? (
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
    </div>
  );
}