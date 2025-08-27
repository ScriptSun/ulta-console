import { useState, useEffect } from 'react';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
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
import { BatchCodeEditor } from './BatchCodeEditor';
import { 
  Save, 
  CheckCircle2, 
  FileCode, 
  Play,
  AlertTriangle,
  Monitor,
  Server,
  HardDrive,
  Cpu
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
  auto_version: boolean;
  active_version?: number;
  customer_id?: string;
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
    auto_version: false,
  });
  const [scriptContent, setScriptContent] = useState(DEFAULT_SCRIPT);
  const [notes, setNotes] = useState('');
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  
  const { toast } = useToast();
  const isEditing = !!batch?.id;
  const canEdit = userRole === 'editor' || userRole === 'approver' || userRole === 'admin';
  const canActivate = userRole === 'approver' || userRole === 'admin';

  useEffect(() => {
    if (batch) {
      setFormData(batch);
      // Load the active version content if editing
      if (batch.id && batch.active_version) {
        loadBatchVersion(batch.id, batch.active_version);
      }
    } else {
      setFormData({
        name: '',
        os_targets: [],
        risk: 'medium',
        max_timeout_sec: 300,
        auto_version: false,
      });
      setScriptContent(DEFAULT_SCRIPT);
      setNotes('');
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

  const loadBatchVersion = async (batchId: string, version: number) => {
    try {
      const { data, error } = await supabase
        .from('script_batch_versions')
        .select('source, notes')
        .eq('batch_id', batchId)
        .eq('version', version)
        .single();

      if (error) throw error;

      if (data) {
        setScriptContent(data.source);
        setNotes(data.notes || '');
      }
    } catch (error) {
      console.error('Error loading batch version:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch version',
        variant: 'destructive',
      });
    }
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

    if (!validation?.isValid) {
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

    if (!validation?.isValid) {
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

    if (!validation?.isValid) {
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
          <div className="space-y-6">
            {/* Basic Information */}
            <div className="space-y-4 p-4 bg-card/30 rounded-lg border">
              <h3 className="text-lg font-semibold">Basic Information</h3>
              
              {/* Batch Name, Timeout, and Risk Level in same div as 3 divs */}
              <div className="grid grid-cols-[2fr_1fr_1fr] gap-4">
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
                
                <div className="space-y-2">
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

                <div className="space-y-2">
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

            <Separator />

            {/* Code Editor */}
            <BatchCodeEditor
              content={scriptContent}
              onChange={setScriptContent}
              onValidationChange={setValidation}
              readOnly={!canEdit}
            />

            {/* Actions */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <Button variant="outline" onClick={onClose}>
                Cancel
              </Button>
              
              {canEdit && (
                <>
                  <Button
                    variant="outline"
                    onClick={handleSaveDraft}
                    disabled={loading || !validation?.isValid}
                  >
                    <Save className="h-4 w-4 mr-2" />
                    Save Draft
                  </Button>
                  
                  {!formData.auto_version && (
                    <Button
                      variant="outline"
                      onClick={handleCreateVersion}
                      disabled={loading || !validation?.isValid}
                    >
                      <FileCode className="h-4 w-4 mr-2" />
                      Create Version
                    </Button>
                  )}
                </>
              )}
              
              {canActivate && (
                <Button
                  onClick={handleActivateVersion}
                  disabled={loading || !validation?.isValid}
                  className="bg-gradient-primary hover:bg-primary-dark"
                >
                  <Play className="h-4 w-4 mr-2" />
                  Activate Version
                </Button>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}