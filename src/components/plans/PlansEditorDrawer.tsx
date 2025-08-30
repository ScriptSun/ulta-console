import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Plus, X, AlertCircle, Save, Copy } from 'lucide-react';
import { 
  Plan, 
  CreatePlanRequest, 
  UpdatePlanRequest, 
  BillingPeriod, 
  SupportLevel, 
  AnalyticsLevel,
  BILLING_PERIOD_LABELS,
  SUPPORT_LEVEL_LABELS,
  ANALYTICS_LEVEL_LABELS
} from '@/types/planTypes';
import { planStorage } from '@/utils/planStorage';
import { useToast } from '@/hooks/use-toast';

interface PlansEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: Plan | null;
  onSuccess: () => void;
}

export function PlansEditorDrawer({ 
  isOpen, 
  onClose, 
  plan, 
  onSuccess 
}: PlansEditorDrawerProps) {
  const [formData, setFormData] = useState<Partial<CreatePlanRequest | UpdatePlanRequest>>({
    name: '',
    slug: '',
    description: '',
    allowedBillingPeriods: ['monthly'],
    limits: { ai_requests: 25, server_events: 25 },
    features: [],
    supportLevel: 'community',
    analyticsLevel: 'basic',
    enabled: true,
  });
  const [newFeature, setNewFeature] = useState('');
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = !!plan;
  const isEnabled = 'enabled' in formData ? formData.enabled : true;

  useEffect(() => {
    if (plan) {
      setFormData({
        ...plan,
      });
    } else {
      setFormData({
        name: '',
        slug: '',
        description: '',
        allowedBillingPeriods: ['monthly'],
        limits: { ai_requests: 25, server_events: 25 },
        features: [],
        supportLevel: 'community',
        analyticsLevel: 'basic',
        enabled: true,
      });
    }
    setErrors([]);
    setNewFeature('');
  }, [plan, isOpen]);

  // Auto-generate slug from name
  useEffect(() => {
    if (!isEditing && formData.name && !formData.slug) {
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      setFormData(prev => ({ ...prev, slug }));
    }
  }, [formData.name, isEditing, formData.slug]);

  const handleInputChange = (field: string, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const handleLimitChange = (limitType: 'ai_requests' | 'server_events', value: string) => {
    const numValue = parseInt(value) || 0;
    setFormData(prev => ({
      ...prev,
      limits: { ...prev.limits!, [limitType]: numValue }
    }));
    setErrors([]);
  };

  const handleBillingPeriodToggle = (period: BillingPeriod) => {
    const current = formData.allowedBillingPeriods || [];
    const updated = current.includes(period)
      ? current.filter(i => i !== period)
      : [...current, period];
    
    setFormData(prev => ({ ...prev, allowedBillingPeriods: updated }));
    setErrors([]);
  };

  const handleAddFeature = () => {
    if (newFeature.trim()) {
      const features = [...(formData.features || []), newFeature.trim()];
      setFormData(prev => ({ ...prev, features }));
      setNewFeature('');
    }
  };

  const handleRemoveFeature = (index: number) => {
    const features = [...(formData.features || [])];
    features.splice(index, 1);
    setFormData(prev => ({ ...prev, features }));
  };

  const handleSave = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const validationErrors = planStorage.validatePlan(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      if (isEditing) {
        const updateRequest: UpdatePlanRequest = {
          id: plan!.id,
          ...formData,
        };
        planStorage.updatePlan(updateRequest);
        toast({
          title: 'Plan Updated',
          description: `Plan "${formData.name}" has been updated successfully.`,
        });
      } else {
        planStorage.createPlan(formData as CreatePlanRequest);
        toast({
          title: 'Plan Created',
          description: `Plan "${formData.name}" has been created successfully.`,
        });
      }

      onSuccess();
      onClose();
    } catch (error) {
      const message = error instanceof Error ? error.message : 'An error occurred';
      setErrors([message]);
      toast({
        title: 'Error',
        description: message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const billingPeriods: BillingPeriod[] = ['monthly', '3months', '6months', '1year', '2years', '3years'];
  const supportLevels: SupportLevel[] = ['community', 'basic', 'priority', 'dedicated'];
  const analyticsLevels: AnalyticsLevel[] = ['basic', 'advanced'];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            {isEditing ? (
              <>
                <span>Edit Plan</span>
                {plan && <Badge variant="outline">v{plan.version}</Badge>}
              </>
            ) : (
              'Create New Plan'
            )}
          </SheetTitle>
          <SheetDescription>
            {isEditing 
              ? 'Update plan configuration. Version will increment if limits, periods, features, or support level change.'
              : 'Configure a new subscription plan for your company.'
            }
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-180px)] mt-6">
          <div className="space-y-6">
            {errors.length > 0 && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  <ul className="list-disc list-inside space-y-1">
                    {errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </AlertDescription>
              </Alert>
            )}

            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Plan Name *</Label>
                  <Input
                    id="name"
                    value={formData.name || ''}
                    onChange={(e) => handleInputChange('name', e.target.value)}
                    placeholder="e.g., Professional"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="slug">Slug *</Label>
                  <Input
                    id="slug"
                    value={formData.slug || ''}
                    onChange={(e) => handleInputChange('slug', e.target.value)}
                    placeholder="e.g., professional"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => handleInputChange('description', e.target.value)}
                  placeholder="Brief description of this plan..."
                  rows={2}
                />
              </div>

              {isEditing && (
                <div className="flex items-center space-x-2">
                  <Switch
                    id="enabled"
                    checked={isEnabled}
                    onCheckedChange={(checked) => handleInputChange('enabled', checked)}
                  />
                  <Label htmlFor="enabled">Plan Enabled</Label>
                </div>
              )}
            </div>

            <Separator />

            {/* Billing Periods */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Billing Periods *</h3>
              <div className="grid grid-cols-3 gap-4">
                {billingPeriods.map((period) => (
                  <div key={period} className="flex items-center space-x-2">
                    <Checkbox
                      id={period}
                      checked={formData.allowedBillingPeriods?.includes(period)}
                      onCheckedChange={() => handleBillingPeriodToggle(period)}
                    />
                    <Label htmlFor={period}>
                      {BILLING_PERIOD_LABELS[period]}
                    </Label>
                  </div>
                ))}
              </div>
            </div>

            <Separator />

            {/* Limits */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Usage Limits *</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="ai_requests">AI Requests (per month)</Label>
                  <Input
                    id="ai_requests"
                    type="number"
                    min="1"
                    value={formData.limits?.ai_requests || ''}
                    onChange={(e) => handleLimitChange('ai_requests', e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="server_events">Server Events (per month)</Label>
                  <Input
                    id="server_events"
                    type="number"
                    min="1"
                    value={formData.limits?.server_events || ''}
                    onChange={(e) => handleLimitChange('server_events', e.target.value)}
                  />
                </div>
              </div>
            </div>

            <Separator />

            {/* Features */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Features</h3>
              
              <div className="flex gap-2">
                <Input
                  value={newFeature}
                  onChange={(e) => setNewFeature(e.target.value)}
                  placeholder="Add a feature..."
                  onKeyPress={(e) => e.key === 'Enter' && handleAddFeature()}
                />
                <Button onClick={handleAddFeature} size="sm">
                  <Plus className="h-4 w-4" />
                </Button>
              </div>

              {formData.features && formData.features.length > 0 && (
                <div className="space-y-2">
                  {formData.features.map((feature, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                      <span className="text-sm">{feature}</span>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRemoveFeature(index)}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <Separator />

            {/* Support & Analytics */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Service Levels</h3>
              
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="supportLevel">Support Level</Label>
                  <Select
                    value={formData.supportLevel}
                    onValueChange={(value) => handleInputChange('supportLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {supportLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {SUPPORT_LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="analyticsLevel">Analytics Level</Label>
                  <Select
                    value={formData.analyticsLevel}
                    onValueChange={(value) => handleInputChange('analyticsLevel', value)}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {analyticsLevels.map((level) => (
                        <SelectItem key={level} value={level}>
                          {ANALYTICS_LEVEL_LABELS[level]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
          </div>
        </ScrollArea>

        <SheetFooter className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {isEditing && plan && (
                <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
              )}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                Cancel
              </Button>
              <Button onClick={handleSave} disabled={loading}>
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : isEditing ? 'Update Plan' : 'Create Plan'}
              </Button>
            </div>
          </div>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}