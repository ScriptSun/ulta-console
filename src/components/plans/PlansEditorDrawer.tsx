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
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { AlertCircle, Save, X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SubscriptionPlan, useSubscriptionPlans } from '@/hooks/useSubscriptionPlans';
import { useToast } from '@/hooks/use-toast';

interface PlansEditorDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  plan: SubscriptionPlan | null;
  onSuccess: () => void;
}

export function PlansEditorDrawer({ 
  isOpen, 
  onClose, 
  plan, 
  onSuccess 
}: PlansEditorDrawerProps) {
  const { createPlan, updatePlan } = useSubscriptionPlans();
  const [formData, setFormData] = useState<Partial<SubscriptionPlan>>({
    name: '',
    key: '',
    slug: '',
    description: '',
    price_monthly: 0,
    monthly_ai_requests: 25,
    monthly_server_events: 25,
    stripe_price_id: '',
    active: true,
  });
  const [errors, setErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const isEditing = !!plan;

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
        key: '',
        slug: '',
        description: '',
        price_monthly: 0,
        monthly_ai_requests: 25,
        monthly_server_events: 25,
        stripe_price_id: '',
        active: true,
      });
    }
    setErrors([]);
  }, [plan, isOpen]);

  // Auto-generate key and slug from name
  useEffect(() => {
    if (!isEditing && formData.name && (!formData.key || !formData.slug)) {
      const key = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, '')
        .replace(/\s+/g, '_')
        .trim() + '_plan';
      const slug = formData.name
        .toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .trim();
      setFormData(prev => ({ 
        ...prev, 
        key: !prev.key ? key : prev.key,
        slug: !prev.slug ? slug : prev.slug 
      }));
    }
  }, [formData.name, isEditing, formData.key, formData.slug]);

  const handleInputChange = (field: keyof SubscriptionPlan, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors([]);
  };

  const validatePlan = (data: Partial<SubscriptionPlan>): string[] => {
    const errors: string[] = [];

    if (!data.name?.trim()) {
      errors.push('Plan name is required');
    }

    if (!data.key?.trim()) {
      errors.push('Plan key is required');
    } else if (!/^[a-z0-9_]+$/.test(data.key)) {
      errors.push('Plan key must contain only lowercase letters, numbers, and underscores');
    }

    if (!data.slug?.trim()) {
      errors.push('Plan slug is required');
    } else if (!/^[a-z0-9_-]+$/.test(data.slug)) {
      errors.push('Plan slug must contain only lowercase letters, numbers, hyphens, and underscores');
    }

    if (!data.monthly_ai_requests || data.monthly_ai_requests <= 0) {
      errors.push('AI requests limit must be greater than 0');
    }

    if (!data.monthly_server_events || data.monthly_server_events <= 0) {
      errors.push('Server events limit must be greater than 0');
    }

    if (data.price_monthly === undefined || data.price_monthly < 0) {
      errors.push('Price must be 0 or greater');
    }

    return errors;
  };

  const handleSave = async () => {
    setLoading(true);
    setErrors([]);

    try {
      const validationErrors = validatePlan(formData);
      if (validationErrors.length > 0) {
        setErrors(validationErrors);
        return;
      }

      if (isEditing) {
        await updatePlan(plan!.id, formData);
        toast({
          title: 'Plan Updated',
          description: `Plan "${formData.name}" has been updated successfully.`,
        });
      } else {
        await createPlan(formData as Omit<SubscriptionPlan, 'id' | 'created_at' | 'updated_at'>);
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

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-2xl">
        <SheetHeader>
          <div className="flex items-center justify-between">
            <div>
              <SheetTitle>
                {isEditing ? 'Edit Plan' : 'Create New Plan'}
              </SheetTitle>
              <SheetDescription>
                {isEditing 
                  ? 'Update plan configuration and settings.'
                  : 'Configure a new subscription plan for your company.'
                }
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        <div className="h-[calc(100vh-180px)] mt-6">
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
                <TabsList className="grid grid-cols-3 w-full">
                  <TabsTrigger value="basic">Basic Info</TabsTrigger>
                  <TabsTrigger value="limits">Limits & Pricing</TabsTrigger>
                  <TabsTrigger value="integration">Integration</TabsTrigger>
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
                      <Label htmlFor="key">Plan Key *</Label>
                      <Input
                        id="key"
                        value={formData.key || ''}
                        onChange={(e) => handleInputChange('key', e.target.value)}
                        placeholder="e.g., professional_plan"
                      />
                    </div>
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
                        id="active"
                        checked={formData.active}
                        onCheckedChange={(checked) => handleInputChange('active', checked)}
                      />
                      <Label htmlFor="active">Plan Active</Label>
                    </div>
                  )}
                </TabsContent>

                <TabsContent value="limits" className="space-y-4 mt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="monthly_ai_requests">AI Requests (per month) *</Label>
                      <Input
                        id="monthly_ai_requests"
                        type="number"
                        min="1"
                        value={formData.monthly_ai_requests || ''}
                        onChange={(e) => handleInputChange('monthly_ai_requests', parseInt(e.target.value) || 0)}
                        placeholder="25"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="monthly_server_events">Server Events (per month) *</Label>
                      <Input
                        id="monthly_server_events"
                        type="number"
                        min="1"
                        value={formData.monthly_server_events || ''}
                        onChange={(e) => handleInputChange('monthly_server_events', parseInt(e.target.value) || 0)}
                        placeholder="25"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="price_monthly">Monthly Price (USD) *</Label>
                    <Input
                      id="price_monthly"
                      type="number"
                      min="0"
                      step="0.01"
                      value={formData.price_monthly || ''}
                      onChange={(e) => handleInputChange('price_monthly', parseFloat(e.target.value) || 0)}
                      placeholder="0.00"
                    />
                  </div>
                </TabsContent>

                <TabsContent value="integration" className="space-y-4 mt-6">
                  <div className="space-y-2">
                    <Label htmlFor="stripe_price_id">Stripe Price ID</Label>
                    <Input
                      id="stripe_price_id"
                      value={formData.stripe_price_id || ''}
                      onChange={(e) => handleInputChange('stripe_price_id', e.target.value)}
                      placeholder="e.g., price_1234567890"
                    />
                    <p className="text-xs text-muted-foreground">
                      Optional: Link this plan to a Stripe price for payment processing
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </ScrollArea>
        </div>

        <SheetFooter className="border-t pt-4 mt-4">
          <div className="flex justify-between items-center w-full">
            <div className="text-sm text-muted-foreground">
              {isEditing && plan && (
                <span>Created {new Date(plan.created_at).toLocaleDateString()}</span>
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