import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BatchCodeEditor } from './BatchCodeEditor';
import { BatchDependenciesTab } from './BatchDependenciesTab';
import { BatchInputsTab } from './BatchInputsTab';
import { BatchOSVariantsEditor } from './BatchOSVariantsEditor';
import { BatchVariantSwitcher, BatchVariant } from './BatchVariantSwitcher';
import { BatchVariantsList } from './BatchVariantsList';
import { 
  Save, 
  CheckCircle2, 
  FileCode, 
  Play,
  AlertTriangle,
  Monitor,
  Server,
  HardDrive,
  Cpu,
  Link,
  Info
} from 'lucide-react';
import { getOSOptions, getRiskOptions, type ValidationResult } from '@/utils/scriptValidation';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface ScriptBatch {
  id?: string;
  name: string;
  os_targets: string[];
  risk: 'low' | 'medium' | 'high';
  max_timeout_sec: number;
  per_agent_concurrency: number;
  per_tenant_concurrency: number;
  auto_version: boolean;
  active_version?: number;
  customer_id?: string;
  inputs_schema?: any;
  inputs_defaults?: any;
}

interface BatchDrawerProps {
  batch: ScriptBatch | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  userRole: 'viewer' | 'editor' | 'approver' | 'admin';
}

const DEFAULT_SCRIPT = `#!/bin/bash

# Batch script template
# Add your bash commands here

echo "Starting batch execution..."

# Example commands:
# whoami
# pwd
# ls -la

echo "Batch execution completed."
`;

export function BatchDrawer({ batch, isOpen, onClose, onSuccess, userRole }: BatchDrawerProps) {
  const [formData, setFormData] = useState<ScriptBatch>({
    name: '',
    os_targets: [],
    risk: 'medium',
    max_timeout_sec: 300,
    per_agent_concurrency: 1,
    per_tenant_concurrency: 10,
    auto_version: false,
  });
  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [inputsValid, setInputsValid] = useState(true);
  const [inputsErrors, setInputsErrors] = useState<string[]>([]);
  const [variants, setVariants] = useState<BatchVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  
  const { toast } = useToast();
  const isEditing = !!batch?.id;
  const canEdit = userRole === 'editor' || userRole === 'approver' || userRole === 'admin';
  const canActivate = userRole === 'approver' || userRole === 'admin';

  useEffect(() => {
    if (batch) {
      setFormData(batch);
      // Load variants for existing batch
      if (batch.id) {
        loadBatchVariants(batch.id);
      }
    } else {
      setFormData({
        name: '',
        os_targets: [],
        risk: 'medium',
        max_timeout_sec: 300,
        per_agent_concurrency: 1,
        per_tenant_concurrency: 10,
        auto_version: false,
      });
      setScriptContent(DEFAULT_SCRIPT);
      setNotes('');
      setVariants([]);
    }
  }, [batch]);

  useEffect(() => {
    // Save unsaved changes to localStorage
    if (hasUnsavedChanges && formData.name) {
      const key = `batch_draft_${batch?.id || 'new'}`;
      localStorage.setItem(key, JSON.stringify({
        formData,
        scriptContent,
        notes,
        timestamp: Date.now()
      }));
    }
  }, [formData, scriptContent, notes, hasUnsavedChanges, batch]);

  useEffect(() => {
    // Load draft from localStorage
    if (isOpen && formData.name) {
      const key = `batch_draft_${batch?.id || 'new'}`;
      const saved = localStorage.getItem(key);
      if (saved) {
        try {
          const draft = JSON.parse(saved);
          // Only load if recent (less than 24 hours)
          if (Date.now() - draft.timestamp < 24 * 60 * 60 * 1000) {
            setFormData(draft.formData);
            setScriptContent(draft.scriptContent);
            setNotes(draft.notes);
            setHasUnsavedChanges(true);
          }
        } catch (error) {
          console.error('Error loading draft:', error);
        }
      }
    }
  }, [isOpen, formData.name, batch]);

  const loadBatchVariants = async (batchId: string) => {
    setLoadingVariants(true);
    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/script-batches/${batchId}/variants`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      const data = await response.json();
      setVariants(data?.variants || []);
    } catch (error) {
      console.error('Error loading variants:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch variants',
        variant: 'destructive',
      });
    } finally {
      setLoadingVariants(false);
    }
  };

  const handleVariantChange = async (os: string, source: string, notes?: string) => {
    if (!batch?.id) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/script-batches/${batch.id}/variants`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ os, source, notes }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      // Reload variants to get updated list
      await loadBatchVariants(batch.id);
      setHasUnsavedChanges(true);
    } catch (error) {
      console.error('Error updating variant:', error);
      toast({
        title: 'Error',
        description: 'Failed to update variant',
        variant: 'destructive',
      });
    }
  };

  const handleCreateVariantVersion = async (os: string) => {
    if (!batch?.id) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/script-batches/${batch.id}/variants/${os}/versions`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({}),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      await loadBatchVariants(batch.id);
      toast({
        title: 'Success',
        description: `Created new version for ${os}`,
      });
    } catch (error) {
      console.error('Error creating variant version:', error);
      toast({
        title: 'Error',
        description: 'Failed to create variant version',
        variant: 'destructive',
      });
    }
  };

  const handleActivateVariantVersion = async (os: string, version: number) => {
    if (!batch?.id) return;

    try {
      const session = await supabase.auth.getSession();
      const token = session.data.session?.access_token;
      
      if (!token) {
        throw new Error('No authentication token available');
      }

      const response = await fetch(
        `https://lfsdqyvvboapsyeauchm.supabase.co/functions/v1/script-batches/${batch.id}/variants/${os}/activate`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ version }),
        }
      );

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP error! status: ${response.status}, message: ${errorText}`);
      }

      await loadBatchVariants(batch.id);
      toast({
        title: 'Success',
        description: `Activated ${os} v${version}`,
      });
    } catch (error) {
      console.error('Error activating version:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate version',
        variant: 'destructive',
      });
    }
  };

  const handleAddVariant = async (os: string, sourceFromOs?: string) => {
    if (!batch?.id) return;

    let source = DEFAULT_SCRIPT;
    
    // If duplicating from another OS, get its source
    if (sourceFromOs) {
      const sourceVariant = variants.find(v => v.os === sourceFromOs && v.active);
      if (sourceVariant) {
        source = sourceVariant.source;
      }
    }

    await handleVariantChange(os, source, `Initial ${os} variant`);
  };

  const handleSaveDraft = async () => {
    if (!canEdit) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to edit batches',
        variant: 'destructive',
      });
      return;
    }

    if (!validation?.isValid || !inputsValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix validation errors before saving',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('script-batches', {
        body: {
          action: 'save_draft',
          batch_id: batch?.id,
          ...formData,
          source: scriptContent,
          notes,
          sha256: validation.sha256,
          size_bytes: validation.sizeBytes
        }
      });

      if (error) throw error;

      toast({
        title: 'Draft Saved',
        description: 'Batch draft saved successfully',
      });

      // Clear draft from localStorage
      const key = `batch_draft_${batch?.id || 'new'}`;
      localStorage.removeItem(key);
      setHasUnsavedChanges(false);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Error',
        description: 'Failed to save draft',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateVersion = async () => {
    if (!canEdit) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to create versions',
        variant: 'destructive',
      });
      return;
    }

    if (!validation?.isValid || !inputsValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix validation errors before creating version',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('script-batches', {
        body: {
          action: 'create_version',
          batch_id: batch?.id,
          ...formData,
          source: scriptContent,
          notes,
          sha256: validation.sha256,
          size_bytes: validation.sizeBytes
        }
      });

      if (error) throw error;

      toast({
        title: 'Version Created',
        description: `Version ${data.version} created successfully`,
      });

      // Clear draft from localStorage
      const key = `batch_draft_${batch?.id || 'new'}`;
      localStorage.removeItem(key);
      setHasUnsavedChanges(false);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: 'Error',
        description: 'Failed to create version',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleActivateVersion = async () => {
    if (!canActivate) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to activate versions',
        variant: 'destructive',
      });
      return;
    }

    if (!validation?.isValid || !inputsValid) {
      toast({
        title: 'Validation Error',
        description: 'Please fix validation errors before activating',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('script-batches', {
        body: {
          action: 'activate_version',
          batch_id: batch?.id,
          ...formData,
          source: scriptContent,
          notes,
          sha256: validation.sha256,
          size_bytes: validation.sizeBytes
        }
      });

      if (error) throw error;

      toast({
        title: 'Version Activated',
        description: `Version ${data.version} activated successfully`,
      });

      // Clear draft from localStorage
      const key = `batch_draft_${batch?.id || 'new'}`;
      localStorage.removeItem(key);
      setHasUnsavedChanges(false);
      
      onSuccess();
      onClose();
    } catch (error) {
      console.error('Error activating version:', error);
      toast({
        title: 'Error',
        description: 'Failed to activate version',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleFormChange = (field: keyof ScriptBatch, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setHasUnsavedChanges(true);
  };

  const handleOSTargetToggle = (os: string) => {
    const newTargets = formData.os_targets.includes(os)
      ? formData.os_targets.filter(t => t !== os)
      : [...formData.os_targets, os];
    handleFormChange('os_targets', newTargets);
  };

  const riskOptions = getRiskOptions();
  const osOptions = getOSOptions();

  // OS Icons mapping
  const getOSIcon = (osValue: string) => {
    const iconMap = {
      ubuntu: Monitor,
      debian: Monitor,
      almalinux: Server,
      windows: HardDrive,
      centos: Cpu,
      rhel: Server,
    };
    return iconMap[osValue as keyof typeof iconMap] || Monitor;
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="sm:max-w-4xl">
        <SheetHeader>
          <SheetTitle>
            {isEditing ? `Edit Batch: ${batch?.name}` : 'New Batch'}
          </SheetTitle>
          <SheetDescription>
            {isEditing ? 'Edit batch configuration and script content' : 'Create a new script batch template'}
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-120px)] mt-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="general">General</TabsTrigger>
              <TabsTrigger value="inputs" className="flex items-center gap-2">
                <FileCode className="h-4 w-4" />
                Inputs
              </TabsTrigger>
              <TabsTrigger value="dependencies" className="flex items-center gap-2">
                <Link className="h-4 w-4" />
                Dependencies
              </TabsTrigger>
              <TabsTrigger value="script">Script</TabsTrigger>
            </TabsList>

            <TabsContent value="general" className="space-y-6 mt-6">
              {/* Basic Information */}
              <div className="space-y-4 p-4 bg-card/30 rounded-lg border">
                <h3 className="text-lg font-semibold">Basic Information</h3>
              
              {/* Batch Name Row */}
              <div className="space-y-2">
                <Label htmlFor="name">Batch Name *</Label>
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => handleFormChange('name', e.target.value)}
                  placeholder="Enter batch name"
                  disabled={!canEdit}
                />
              </div>

              {/* Timeout, Concurrency, and Risk Level in grid */}
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-3 space-y-2">
                  <Label htmlFor="timeout">Max Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.max_timeout_sec}
                    onChange={(e) => handleFormChange('max_timeout_sec', parseInt(e.target.value) || 300)}
                    min={30}
                    max={3600}
                    disabled={!canEdit}
                  />
                </div>

                <div className="col-span-3 space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="per-agent-concurrency">Per agent concurrency</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-blue-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How many runs of this batch may run on the same agent at once</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="per-agent-concurrency"
                    type="number"
                    value={formData.per_agent_concurrency}
                    onChange={(e) => handleFormChange('per_agent_concurrency', parseInt(e.target.value) || 1)}
                    min={1}
                    max={10}
                    disabled={!canEdit}
                  />
                </div>

                <div className="col-span-3 space-y-2">
                  <div className="flex items-center gap-1">
                    <Label htmlFor="per-tenant-concurrency">Per tenant concurrency</Label>
                    <TooltipProvider>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <Info className="h-4 w-4 text-blue-500 cursor-help" />
                        </TooltipTrigger>
                        <TooltipContent>
                          <p>How many runs of this batch may run across all tenant agents at once</p>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  <Input
                    id="per-tenant-concurrency"
                    type="number"
                    value={formData.per_tenant_concurrency}
                    onChange={(e) => handleFormChange('per_tenant_concurrency', parseInt(e.target.value) || 10)}
                    min={1}
                    max={100}
                    disabled={!canEdit}
                  />
                </div>

                <div className="col-span-3 space-y-2">
                  <Label>Risk Level</Label>
                  <Select
                    value={formData.risk}
                    onValueChange={(value) => handleFormChange('risk', value)}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {riskOptions.map((risk) => (
                        <SelectItem key={risk.value} value={risk.value}>
                           <div className="flex items-center gap-2">
                             <Badge variant="secondary" className={cn("text-xs font-medium", risk.color)}>
                               {risk.label}
                             </Badge>
                           </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-version"
                  checked={formData.auto_version}
                  onCheckedChange={(checked) => handleFormChange('auto_version', checked)}
                  disabled={!canEdit}
                />
                <Label htmlFor="auto-version">Auto version on save</Label>
              </div>
              </div>

              <Separator />

              {/* Notes */}
              <div className="space-y-2">
                <Label htmlFor="notes">Notes for this version</Label>
                <Textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Optional notes about this version..."
                  rows={3}
                  disabled={!canEdit}
                />
              </div>
            </TabsContent>

            <TabsContent value="inputs" className="mt-6">
              <BatchInputsTab 
                inputsSchema={formData.inputs_schema}
                inputsDefaults={formData.inputs_defaults}
                canEdit={canEdit}
                onSchemaChange={(schema) => {
                  handleFormChange('inputs_schema', schema);
                }}
                onDefaultsChange={(defaults) => {
                  handleFormChange('inputs_defaults', defaults);
                }}
                onValidationChange={(isValid, errors) => {
                  setInputsValid(isValid);
                  setInputsErrors(errors);
                }}
              />
            </TabsContent>

            <TabsContent value="dependencies" className="mt-6">
              <BatchDependenciesTab 
                batchId={batch?.id} 
                canEdit={canEdit}
                onDependencyChange={() => {
                  // Trigger any necessary updates when dependencies change
                  setHasUnsavedChanges(true);
                }}
              />
            </TabsContent>

            <TabsContent value="script" className="space-y-4 mt-6">
              {/* OS Targets Selection */}
              <div className="space-y-2">
                <Label>OS Targets</Label>
                <div className="flex flex-wrap gap-2">
                  {osOptions.map((os) => {
                    const OSIcon = getOSIcon(os.value);
                    return (
                      <button
                        key={os.value}
                        type="button"
                        onClick={() => handleOSTargetToggle(os.value)}
                        disabled={!canEdit}
                        className={cn(
                          "px-3 py-1 rounded-md border text-sm transition-colors flex items-center gap-2",
                          formData.os_targets.includes(os.value)
                            ? "bg-primary text-primary-foreground border-primary"
                            : "bg-background border-border hover:bg-muted"
                        )}
                      >
                        <OSIcon className="h-4 w-4" />
                        {os.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Separator />

              {formData.os_targets.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <AlertTriangle className="h-8 w-8 mx-auto mb-2" />
                  <p>Please select OS targets above first</p>
                </div>
              ) : isEditing && batch?.id ? (
                <BatchOSVariantsEditor
                  batchId={batch.id}
                  osTargets={formData.os_targets}
                  canEdit={canEdit}
                  canActivate={canActivate}
                  onSuccess={() => {
                    setHasUnsavedChanges(false);
                    onSuccess();
                  }}
                />
              ) : (
                <div className="space-y-4">
                  {/* Basic script editor for new batch */}
                  <div className="p-4 border rounded-lg bg-muted/50">
                    <h4 className="font-medium text-sm mb-2">Main Script</h4>
                    <p className="text-xs text-muted-foreground mb-3">
                      This will be used as the default script for all OS targets. 
                      You can create OS-specific variants after saving.
                    </p>
                  </div>
                  
                  <BatchCodeEditor
                    content={scriptContent}
                    onChange={(value) => {
                      setScriptContent(value);
                      setHasUnsavedChanges(true);
                    }}
                    readOnly={!canEdit}
                  />
                  
                  <div className="space-y-2">
                    <Label htmlFor="notes">Version Notes</Label>
                    <Textarea
                      id="notes"
                      value={notes}
                      onChange={(e) => {
                        setNotes(e.target.value);
                        setHasUnsavedChanges(true);
                      }}
                      placeholder="Describe what this version does..."
                      disabled={!canEdit}
                    />
                  </div>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}