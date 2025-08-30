import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Check, Zap, Server, Users, BarChart3 } from 'lucide-react';
import { Plan, BILLING_PERIOD_LABELS, SUPPORT_LEVEL_LABELS, ANALYTICS_LEVEL_LABELS } from '@/types/planTypes';
import { cn } from '@/lib/utils';

interface PlanPreviewCardProps {
  plan: Partial<Plan>;
  className?: string;
}

export function PlanPreviewCard({ plan, className }: PlanPreviewCardProps) {
  if (!plan.name) {
    return (
      <Card className={cn("w-full", className)}>
        <CardContent className="flex items-center justify-center h-48 text-muted-foreground">
          <p>Preview will appear here</p>
        </CardContent>
      </Card>
    );
  }

  const formatBillingPeriods = (periods: string[] = []) => {
    return periods.map(period => 
      BILLING_PERIOD_LABELS[period as keyof typeof BILLING_PERIOD_LABELS]
    ).join(', ');
  };

  return (
    <Card className={cn("w-full animate-fade-in", className)}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-xl">{plan.name}</CardTitle>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="font-mono">
              v{plan.version || 1}
            </Badge>
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
          </div>
        </div>
        {plan.slug && (
          <p className="text-sm text-muted-foreground">/{plan.slug}</p>
        )}
        {plan.description && (
          <p className="text-sm text-muted-foreground mt-2">{plan.description}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Usage Limits */}
        <div className="space-y-3">
          <h4 className="text-sm font-medium flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Usage Limits
          </h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">AI Requests</span>
              <span className="font-medium">
                {plan.limits?.ai_requests?.toLocaleString() || '0'}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
              <span className="text-sm text-muted-foreground">Server Events</span>
              <span className="font-medium">
                {plan.limits?.server_events?.toLocaleString() || '0'}
              </span>
            </div>
          </div>
        </div>

        <Separator />

        {/* Billing Periods */}
        {plan.allowedBillingPeriods && plan.allowedBillingPeriods.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Billing Periods</h4>
            <p className="text-sm text-muted-foreground">
              {formatBillingPeriods(plan.allowedBillingPeriods)}
            </p>
          </div>
        )}

        <Separator />

        {/* Features */}
        {plan.features && plan.features.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Features</h4>
            <div className="space-y-2">
              {plan.features.map((feature, index) => (
                <div key={index} className="flex items-center gap-2 text-sm">
                  <Check className="h-3 w-3 text-success flex-shrink-0" />
                  <span>{feature}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        <Separator />

        {/* Service Levels */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="h-4 w-4" />
              Support
            </h4>
            <Badge variant="outline" className="text-xs">
              {plan.supportLevel && SUPPORT_LEVEL_LABELS[plan.supportLevel]}
            </Badge>
          </div>
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Analytics
            </h4>
            <Badge variant="outline" className="text-xs">
              {plan.analyticsLevel && ANALYTICS_LEVEL_LABELS[plan.analyticsLevel]}
            </Badge>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}