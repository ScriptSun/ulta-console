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
  if (plans.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-lg mb-2">No plans configured</p>
        <p className="text-sm">Create your first plan to get started</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="border rounded-lg bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Plan Keys</TableHead>
              <TableHead>Total Subscribers</TableHead>
              <TableHead>AI Limit</TableHead>
              <TableHead>Server Limit</TableHead>
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
                    className="bg-purple-500/10 text-purple-700 border-purple-500/20 dark:text-purple-300 font-mono"
                  >
                    {plan.key}
                  </Badge>
                </TableCell>
                <TableCell>
                  <div className="text-center">
                    <div className="text-lg font-bold text-foreground">
                      {(() => {
                        // Mock data: subscribers count by plan key
                        const subscribersByPlan: Record<string, number> = {
                          'free_plan': 150,
                          'basic_plan': 75,
                          'pro_plan': 40,
                          'premium_plan': 25
                        };
                        return (subscribersByPlan[plan.key] || 0).toLocaleString();
                      })()}
                    </div>
                    <div className="text-xs text-muted-foreground">agents</div>
                  </div>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {plan.limits.ai_requests.toLocaleString()}
                  </span>
                </TableCell>
                <TableCell>
                  <span className="text-sm font-medium">
                    {plan.limits.server_events.toLocaleString()}
                  </span>
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
    </div>
  );
}