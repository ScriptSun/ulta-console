import { useState, useEffect, useCallback } from 'react';
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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, X, Eye, EyeOff } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Plan, 
  CreatePlanRequest, 
  UpdatePlanRequest, 
  BillingPeriod, 
  SupportLevel, 
  AnalyticsLevel,
  SUPPORT_LEVEL_LABELS,
  ANALYTICS_LEVEL_LABELS
} from '@/types/planTypes';
import { planStorage } from '@/utils/planStorage';
import { useToast } from '@/hooks/use-toast';
import { FeaturesManager } from './FeaturesManager';
import { PeriodsChooser } from './PeriodsChooser';
import { PlanPreviewCard } from './PlanPreviewCard';
import { cn } from '@/lib/utils';

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
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const { toast } = useToast();

  const isEditing = !!plan;
  const isEnabled = 'enabled' in formData ? formData.enabled : true;

  // Keyboard shortcuts
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onClose();
    } else if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
      handleSave();
    }
  }, [onClose]);

  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }
  }, [isOpen, handleKeyDown]);

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
    setShowPreview(false);
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

  const handleFeaturesChange = (features: string[]) => {
    setFormData(prev => ({ ...prev, features }));
    setErrors([]);
  };

  const handlePeriodsChange = (periods: BillingPeriod[]) => {
    setFormData(prev => ({ ...prev, allowedBillingPeriods: periods }));
    setErrors([]);
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

  const supportLevels: SupportLevel[] = ['community', 'basic', 'priority', 'dedicated'];
  const analyticsLevels: AnalyticsLevel[] = ['basic', 'advanced'];

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-6xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
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
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowPreview(!showPreview)}
            >
              {showPreview ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPreview ? 'Hide Preview' : 'Show Preview'}
            </Button>
          </div>
        </SheetHeader>

        <div className="flex gap-6 h-[calc(100vh-180px)] mt-6">
          {/* Editor Form */}
          <div className={cn("transition-all duration-300", showPreview ? "w-3/5" : "w-full")}>
            <ScrollArea className="h-full">
              <div className="space-y-6 pr-4">
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

                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid grid-cols-4 w-full">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="periods">Billing</TabsTrigger>
                    <TabsTrigger value="limits">Limits</TabsTrigger>
                    <TabsTrigger value="features">Features</TabsTrigger>
                  </TabsList>

                  <TabsContent value="basic" className="space-y-4 mt-6">
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
                        rows={3}
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
                  </TabsContent>

                  <TabsContent value="periods" className="mt-6">
                    <PeriodsChooser
                      selectedPeriods={formData.allowedBillingPeriods || []}
                      onChange={handlePeriodsChange}
                      error={errors.find(e => e.includes('billing period'))}
                    />
                  </TabsContent>

                  <TabsContent value="limits" className="space-y-4 mt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="ai_requests">AI Requests (per month) *</Label>
                        <Input
                          id="ai_requests"
                          type="number"
                          min="1"
                          value={formData.limits?.ai_requests || ''}
                          onChange={(e) => handleLimitChange('ai_requests', e.target.value)}
                          placeholder="25"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="server_events">Server Events (per month) *</Label>
                        <Input
                          id="server_events"
                          type="number"
                          min="1"
                          value={formData.limits?.server_events || ''}
                          onChange={(e) => handleLimitChange('server_events', e.target.value)}
                          placeholder="25"
                        />
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="features" className="mt-6">
                    <FeaturesManager
                      features={formData.features || []}
                      onChange={handleFeaturesChange}
                    />
                  </TabsContent>
                </Tabs>
              </div>
            </ScrollArea>
          </div>

          {/* Preview Panel */}
          {showPreview && (
            <div className="w-2/5 border-l pl-6">
              <div className="sticky top-0">
                <h4 className="text-sm font-medium mb-4 text-muted-foreground">Live Preview</h4>
                <PlanPreviewCard plan={formData} />
              </div>
            </div>
          )}
        </div>

        <SheetFooter className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {isEditing && plan && (
                <span>Created {new Date(plan.createdAt).toLocaleDateString()}</span>
              )}
              <div className="text-xs mt-1">
                Press Esc to close • Ctrl+Enter to save
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={onClose} disabled={loading}>
                <X className="h-4 w-4 mr-2" />
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