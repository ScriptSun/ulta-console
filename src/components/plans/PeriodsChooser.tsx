import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { AlertCircle } from 'lucide-react';
import { BillingPeriod, BILLING_PERIOD_LABELS } from '@/types/planTypes';
import { cn } from '@/lib/utils';

interface PeriodsChooserProps {
  selectedPeriods: BillingPeriod[];
  onChange: (periods: BillingPeriod[]) => void;
  error?: string;
}

const PERIOD_ORDER: BillingPeriod[] = [
  'monthly',
  '3months', 
  '6months',
  '1year',
  '2years',
  '3years'
];

const PERIOD_DESCRIPTIONS = {
  monthly: 'Best for trying out',
  '3months': 'Short-term commitment',
  '6months': 'Popular choice',
  '1year': 'Most cost-effective',
  '2years': 'Extended savings',
  '3years': 'Maximum value'
} as const;

export function PeriodsChooser({ selectedPeriods, onChange, error }: PeriodsChooserProps) {
  const handlePeriodChange = (period: BillingPeriod, checked: boolean) => {
    if (checked) {
      onChange([...selectedPeriods, period]);
    } else {
      onChange(selectedPeriods.filter(p => p !== period));
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Label className="text-base font-medium">Billing Periods</Label>
        <Badge variant="outline" className="text-xs">
          {selectedPeriods.length} selected
        </Badge>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {PERIOD_ORDER.map((period) => {
          const isSelected = selectedPeriods.includes(period);
          
          return (
            <div
              key={period}
              className={cn(
                "flex items-center space-x-3 p-4 border rounded-lg cursor-pointer transition-colors",
                isSelected 
                  ? "border-primary bg-primary/5" 
                  : "border-border hover:border-primary/50"
              )}
              onClick={() => handlePeriodChange(period, !isSelected)}
            >
              <Checkbox
                id={period}
                checked={isSelected}
                onCheckedChange={(checked) => 
                  handlePeriodChange(period, checked as boolean)
                }
                className="pointer-events-none"
              />
              <div className="flex-1 min-w-0">
                <Label 
                  htmlFor={period}
                  className="text-sm font-medium cursor-pointer"
                >
                  {BILLING_PERIOD_LABELS[period]}
                </Label>
                <p className="text-xs text-muted-foreground mt-1">
                  {PERIOD_DESCRIPTIONS[period]}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      {selectedPeriods.length === 0 && (
        <div className="text-center py-6 text-muted-foreground border-2 border-dashed border-border rounded-lg">
          <p className="text-sm">Select at least one billing period</p>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2 text-sm text-destructive">
          <AlertCircle className="h-4 w-4" />
          {error}
        </div>
      )}
    </div>
  );
}