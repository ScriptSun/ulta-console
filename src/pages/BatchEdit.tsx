import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';
import { BatchCodeEditor } from '@/components/scripts/BatchCodeEditor';
import { BatchDependenciesTab } from '@/components/scripts/BatchDependenciesTab';
import { BatchInputsTab } from '@/components/scripts/BatchInputsTab';
import { BatchOSVariantsEditor } from '@/components/scripts/BatchOSVariantsEditor';
import { BatchVariantSwitcher, BatchVariant } from '@/components/scripts/BatchVariantSwitcher';
import { BatchVariantsList } from '@/components/scripts/BatchVariantsList';
import { RenderTemplatePicker } from '@/components/scripts/RenderTemplatePicker';
import { RenderedResultCard } from '@/components/chat/RenderedResultCard';
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
  Info,
  ArrowLeft,
  X
} from 'lucide-react';
import { getRiskOptions, type ValidationResult } from '@/utils/scriptValidation';
import { useOSTargets } from '@/hooks/useOSTargets';
import { api } from '@/lib/api-wrapper';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { RenderConfig, DEFAULT_RENDER_TEMPLATES } from '@/types/renderTypes';

interface ScriptBatch {
  id?: string;
  name: string;
  description?: string;
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
  render_config?: any;
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

export default function BatchEdit() {
  const navigate = useNavigate();
  const { batchId } = useParams();
  const { toast } = useToast();
  
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
  const [loadingBatch, setLoadingBatch] = useState(true);
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [activeTab, setActiveTab] = useState('general');
  const [inputsValid, setInputsValid] = useState(true);
  const [inputsErrors, setInputsErrors] = useState<string[]>([]);
  const [variants, setVariants] = useState<BatchVariant[]>([]);
  const [loadingVariants, setLoadingVariants] = useState(false);
  const [renderConfig, setRenderConfig] = useState<RenderConfig>(DEFAULT_RENDER_TEMPLATES['plain-text']);
  const [userRole, setUserRole] = useState<'viewer' | 'editor' | 'approver' | 'admin'>('admin');
  
  const isEditing = !!batchId && batchId !== 'new';
  const canEdit = userRole === 'editor' || userRole === 'approver' || userRole === 'admin';
  const canActivate = userRole === 'approver' || userRole === 'admin';

  // Load batch data if editing
  useEffect(() => {
    if (isEditing) {
      loadBatch();
    } else {
      // New batch - set defaults
      setLoadingBatch(false);
    }
  }, [batchId]);

  const loadBatch = async () => {
    if (!batchId || batchId === 'new') return;
    
    try {
      setLoadingBatch(true);
      const response = await api.selectOne('script_batches', '*', { id: batchId });
      
      if (!response.success || !response.data) {
        throw new Error('Batch not found');
      }

      const batch = response.data;
      setFormData(batch);
      setRenderConfig(batch.render_config || DEFAULT_RENDER_TEMPLATES['plain-text']);
      
      // Load variants for existing batch
      await loadBatchVariants(batchId);
      
    } catch (error) {
      console.error('Error loading batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to load batch data',
        variant: 'destructive',
      });
      navigate('/scripts/batches');
    } finally {
      setLoadingBatch(false);
    }
  };

  const loadBatchVariants = async (batchId: string) => {
    setLoadingVariants(true);
    try {
      const response = await api.invokeFunction(`script-batches/${batchId}/variants`, {});

      if (response.error) {
        throw new Error(response.error || 'Failed to load variants');
      }

      setVariants(response.data?.variants || []);
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

  // Auto-validate script content
  useEffect(() => {
    if (scriptContent.trim()) {
      // Simple validation for now - just check if content exists and is not empty
      const mockValidation: ValidationResult = {
        isValid: scriptContent.trim().length > 0,
        sha256: `mock-${Date.now()}`, // Temporary mock hash
        sizeBytes: new Blob([scriptContent]).size,
        errors: scriptContent.trim().length === 0 ? ['Script content cannot be empty'] : [],
        warnings: []
      };
      setValidation(mockValidation);
    } else {
      // For empty script, set as valid for new batches
      setValidation({
        isValid: true,
        sha256: 'empty-script',
        sizeBytes: 0,
        errors: [],
        warnings: []
      });
    }
  }, [scriptContent]);

  const handleVariantChange = async (os: string, source: string, notes?: string) => {
    if (!batchId || batchId === 'new') return;

    try {
      const response = await api.invokeFunction(`script-batches/${batchId}/variants`, {
        os,
        source,
        notes
      });

      if (response.error) {
        throw new Error(response.error || 'Failed to update variant');
      }

      // Reload variants to get updated list
      await loadBatchVariants(batchId);
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

  const handleSave = async () => {
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
      let savedBatchId = batchId;

      if (isEditing) {
        // Update existing batch
        const updateResponse = await api.update('script_batches', { id: batchId }, {
          name: formData.name,
          description: formData.description,
          inputs_schema: formData.inputs_schema,
          inputs_defaults: formData.inputs_defaults,
          render_config: renderConfig as any,
          os_targets: formData.os_targets,
          risk: formData.risk,
          max_timeout_sec: formData.max_timeout_sec,
          per_agent_concurrency: formData.per_agent_concurrency,
          per_tenant_concurrency: formData.per_tenant_concurrency,
          auto_version: formData.auto_version,
          preflight: {},
          updated_at: new Date().toISOString()
        });

        if (updateResponse.error) throw new Error(updateResponse.error);
      } else {
        // Create new batch
        const createResponse = await api.insert('script_batches', {
          ...formData,
          inputs_schema: formData.inputs_schema,
          inputs_defaults: formData.inputs_defaults,
          render_config: renderConfig as any,
          preflight: {},
          active_version: null
        });

        if (createResponse.error) throw new Error(createResponse.error);
        savedBatchId = createResponse.data?.id;
      }

      // Save script content if provided
      if (scriptContent && scriptContent.trim() && savedBatchId) {
        const currentOs = formData.os_targets[0] || 'ubuntu-22.04';
        
        if (isEditing) {
          // Check if there's already a variant for this OS
          const existingVariant = variants.find(v => v.os === currentOs);
          
          if (existingVariant && existingVariant.source !== scriptContent) {
            // Update existing variant
            await api.update('script_batch_variants', { id: existingVariant.id }, {
              source: scriptContent,
              notes: notes || 'Updated via batch editor',
              updated_at: new Date().toISOString()
            });
          } else if (!existingVariant) {
            // Create new variant
            await api.insert('script_batch_variants', {
              batch_id: savedBatchId,
              os: currentOs,
              version: 1,
              sha256: validation.sha256,
              size_bytes: validation.sizeBytes,
              source: scriptContent,
              notes: notes || 'Created via batch editor',
              active: false
            });
          }
        } else {
          // For new batches, create initial variant
          await api.insert('script_batch_variants', {
            batch_id: savedBatchId,
            os: currentOs,
            version: 1,
            sha256: validation.sha256,
            size_bytes: validation.sizeBytes,
            source: scriptContent,
            notes: notes || 'Initial version',
            active: false
          });
        }
      }

      toast({
        title: 'Success',
        description: isEditing ? 'Batch updated successfully' : 'Batch created successfully',
      });

      setHasUnsavedChanges(false);
      
      // Navigate back to batches list
      navigate('/scripts/batches');
    } catch (error) {
      console.error('Error saving batch:', error);
      toast({
        title: 'Error',
        description: 'Failed to save batch',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    if (hasUnsavedChanges) {
      if (!confirm('You have unsaved changes. Are you sure you want to leave?')) {
        return;
      }
    }
    navigate('/scripts/batches');
  };

  if (loadingBatch) {
    return (
      <div className="container mx-auto p-6">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" onClick={handleCancel}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Batches
          </Button>
          <div>
            <h1 className="text-2xl font-bold">
              {isEditing ? 'Edit Batch' : 'New Batch'}
            </h1>
            <p className="text-muted-foreground">
              {isEditing ? `Editing ${formData.name}` : 'Create a new batch script'}
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={handleCancel}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={loading || !canEdit}>
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {isEditing ? 'Update Batch' : 'Create Batch'}
          </Button>
        </div>
      </div>

      {/* Main Content */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="general">General</TabsTrigger>
          <TabsTrigger value="script">Script</TabsTrigger>
          <TabsTrigger value="inputs">Inputs</TabsTrigger>
          <TabsTrigger value="dependencies">Dependencies</TabsTrigger>
          <TabsTrigger value="variants">OS Variants</TabsTrigger>
        </TabsList>

        <TabsContent value="general" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Batch Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, name: e.target.value }));
                      setHasUnsavedChanges(true);
                    }}
                    placeholder="e.g., Install Docker"
                    disabled={!canEdit}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="risk">Risk Level</Label>
                  <Select
                    value={formData.risk}
                    onValueChange={(value: 'low' | 'medium' | 'high') => {
                      setFormData(prev => ({ ...prev, risk: value }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!canEdit}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {getRiskOptions().map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={formData.description || ''}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, description: e.target.value }));
                    setHasUnsavedChanges(true);
                  }}
                  placeholder="Describe what this batch does..."
                  className="min-h-[100px]"
                  disabled={!canEdit}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeout">Max Timeout (seconds)</Label>
                  <Input
                    id="timeout"
                    type="number"
                    value={formData.max_timeout_sec}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, max_timeout_sec: parseInt(e.target.value) || 300 }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="agent-concurrency">Per Agent Concurrency</Label>
                  <Input
                    id="agent-concurrency"
                    type="number"
                    value={formData.per_agent_concurrency}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, per_agent_concurrency: parseInt(e.target.value) || 1 }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!canEdit}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="tenant-concurrency">Per Tenant Concurrency</Label>
                  <Input
                    id="tenant-concurrency"
                    type="number"
                    value={formData.per_tenant_concurrency}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, per_tenant_concurrency: parseInt(e.target.value) || 10 }));
                      setHasUnsavedChanges(true);
                    }}
                    disabled={!canEdit}
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="auto-version"
                  checked={formData.auto_version}
                  onCheckedChange={(checked) => {
                    setFormData(prev => ({ ...prev, auto_version: checked }));
                    setHasUnsavedChanges(true);
                  }}
                  disabled={!canEdit}
                />
                <Label htmlFor="auto-version">Auto Version</Label>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="script" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Script Content</CardTitle>
            </CardHeader>
            <CardContent>
              <BatchCodeEditor
                content={scriptContent}
                onChange={(content) => {
                  setScriptContent(content);
                  setHasUnsavedChanges(true);
                }}
                readOnly={!canEdit}
              />
              
              {validation && (
                <div className="mt-4 p-3 rounded-md border">
                  <div className="flex items-center gap-2 mb-2">
                    {validation.isValid ? (
                      <CheckCircle2 className="h-4 w-4 text-green-500" />
                    ) : (
                      <AlertTriangle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">
                      {validation.isValid ? 'Valid' : 'Invalid'}
                    </span>
                  </div>
                  {validation.errors.length > 0 && (
                    <ul className="list-disc list-inside text-sm text-red-600 space-y-1">
                      {validation.errors.map((error, index) => (
                        <li key={index}>{error}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="inputs" className="space-y-6">
          <BatchInputsTab
            inputsSchema={formData.inputs_schema}
            inputsDefaults={formData.inputs_defaults}
            onSchemaChange={(schema) => {
              setFormData(prev => ({ ...prev, inputs_schema: schema }));
              setHasUnsavedChanges(true);
            }}
            onDefaultsChange={(defaults) => {
              setFormData(prev => ({ ...prev, inputs_defaults: defaults }));
              setHasUnsavedChanges(true);
            }}
            onValidationChange={(isValid, errors) => {
              setInputsValid(isValid);
              setInputsErrors(errors);
            }}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="dependencies" className="space-y-6">
          <BatchDependenciesTab
            batchId={batchId}
            canEdit={canEdit}
          />
        </TabsContent>

        <TabsContent value="variants" className="space-y-6">
          {isEditing ? (
            <BatchOSVariantsEditor
              batchId={batchId}
              osTargets={formData.os_targets}
              canEdit={canEdit}
              canActivate={canActivate}
              onOSTargetsChange={(newTargets) => {
                setFormData(prev => ({ ...prev, os_targets: newTargets }));
                setHasUnsavedChanges(true);
              }}
            />
          ) : (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-muted-foreground">
                  OS variants will be available after creating the batch.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}