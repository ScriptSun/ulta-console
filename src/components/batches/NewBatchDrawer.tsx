import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Alert, AlertDescription } from '@/components/ui/alert';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { BatchStepEditor, BatchStep } from './BatchStepEditor';
import { Eye, Play, Shield, CheckCircle, AlertCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { supabase } from '@/integrations/supabase/client';

interface NewBatchDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editBatch?: any;
}

export function NewBatchDrawer({ open, onOpenChange, onSuccess, editBatch }: NewBatchDrawerProps) {
  const [batchName, setBatchName] = useState('');
  const [inputsSchema, setInputsSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "timeout": {\n      "type": "number",\n      "description": "Timeout in seconds",\n      "default": 600\n    },\n    "server": {\n      "type": "string",\n      "description": "Target server name"\n    }\n  },\n  "required": ["server"]\n}');
  const [preflight, setPreflight] = useState('{\n  "min_ram_mb": 1024,\n  "min_disk_free_gb": 10,\n  "require_open_ports": [22, 80]\n}');
  const [active, setActive] = useState(true);
  const [steps, setSteps] = useState<BatchStep[]>([]);
  const [loading, setLoading] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{status: 'ok' | 'error', message: string} | null>(null);
  const { toast } = useToast();

  const resetForm = () => {
    setBatchName('');
    setInputsSchema('{\n  "type": "object",\n  "properties": {\n    "timeout": {\n      "type": "number",\n      "description": "Timeout in seconds",\n      "default": 600\n    },\n    "server": {\n      "type": "string",\n      "description": "Target server name"\n    }\n  },\n  "required": ["server"]\n}');
    setPreflight('{\n  "min_ram_mb": 1024,\n  "min_disk_free_gb": 10,\n  "require_open_ports": [22, 80]\n}');
    setActive(true);
    setSteps([]);
  };

  const validateJson = (json: string, name: string) => {
    try {
      JSON.parse(json);
      return true;
    } catch (error) {
      toast({
        title: 'Invalid JSON',
        description: `${name} contains invalid JSON`,
        variant: 'destructive',
      });
      return false;
    }
  };

  const renderPreviewForm = () => {
    try {
      const schema = JSON.parse(inputsSchema);
      
      if (schema.type === 'object' && schema.properties) {
        return (
          <div className="space-y-3">
            <h4 className="font-medium">Batch Input Form Preview</h4>
            {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
              <div key={key} className="space-y-1">
                <Label>{key} {schema.required?.includes(key) && <span className="text-destructive">*</span>}</Label>
                <Input 
                  placeholder={prop.description || `Enter ${key}`}
                  defaultValue={prop.default || ''}
                  type={prop.type === 'number' ? 'number' : 'text'}
                  disabled
                />
                {prop.description && (
                  <p className="text-xs text-muted-foreground">{prop.description}</p>
                )}
              </div>
            ))}
          </div>
        );
      }
    } catch (error) {
      return (
        <div className="text-sm text-destructive">
          Invalid JSON schema - form preview unavailable
        </div>
      );
    }
    
    return null;
  };

  const renderPreflightSummary = () => {
    try {
      const preflightData = JSON.parse(preflight);
      return (
        <div className="space-y-2">
          <h4 className="font-medium">Preflight Requirements</h4>
          <div className="text-sm space-y-1">
            {preflightData.min_ram_mb && (
              <div>• Minimum RAM: {preflightData.min_ram_mb} MB</div>
            )}
            {preflightData.min_disk_free_gb && (
              <div>• Free disk space: {preflightData.min_disk_free_gb} GB</div>
            )}
            {preflightData.require_open_ports && preflightData.require_open_ports.length > 0 && (
              <div>• Required open ports: {preflightData.require_open_ports.join(', ')}</div>
            )}
          </div>
        </div>
      );
    } catch (error) {
      return <div className="text-sm text-destructive">Invalid preflight JSON</div>;
    }
  };

  const handleValidate = async () => {
    if (!batchName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Batch name is required for validation',
        variant: 'destructive',
      });
      return;
    }

    if (!validateJson(inputsSchema, 'Inputs schema')) return;

    setValidating(true);
    setValidationResult(null);

    try {
      // Sample agent snapshot for validation
      const agentSnapshot = {
        os: 'linux',
        agent_version: '1.0.0',
        ram_mb: 4096,
        disk_free_gb: 50,
        open_ports: [22, 80, 443, 5432]
      };

      // Sample inputs based on schema
      let sampleInputs = {};
      try {
        const schema = JSON.parse(inputsSchema);
        if (schema.properties) {
          Object.entries(schema.properties).forEach(([key, prop]: [string, any]) => {
            if (prop.default !== undefined) {
              sampleInputs[key] = prop.default;
            } else if (prop.type === 'string') {
              sampleInputs[key] = `sample_${key}`;
            } else if (prop.type === 'number') {
              sampleInputs[key] = 123;
            }
          });
        }
      } catch (error) {
        sampleInputs = { example: 'test_value' };
      }

      const { data, error } = await supabase.functions.invoke('validate-batch', {
        body: {
          batch_name: batchName,
          inputs: sampleInputs,
          agent_snapshot: agentSnapshot
        }
      });

      if (error) {
        setValidationResult({
          status: 'error',
          message: `Validation failed: ${error.message}`
        });
      } else if (data) {
        setValidationResult({
          status: data.status,
          message: data.status === 'ok' ? data.message : data.reason
        });
      }
    } catch (error) {
      console.error('Validation error:', error);
      setValidationResult({
        status: 'error',
        message: 'Network error during validation'
      });
    } finally {
      setValidating(false);
    }
  };

  const handleSave = async () => {
    if (!batchName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Batch name is required',
        variant: 'destructive',
      });
      return;
    }

    if (!validateJson(inputsSchema, 'Inputs schema')) return;
    if (!validateJson(preflight, 'Preflight configuration')) return;

    if (steps.length === 0) {
      toast({
        title: 'Validation Error',
        description: 'At least one step is required',
        variant: 'destructive',
      });
      return;
    }

    // Validate all step parameters
    for (const step of steps) {
      if (!step.commandId) {
        toast({
          title: 'Validation Error',
          description: `Step ${step.stepIndex + 1} must have a command selected`,
          variant: 'destructive',
        });
        return;
      }
      if (!validateJson(step.paramsTemplate, `Step ${step.stepIndex + 1} parameters template`)) return;
    }

    setLoading(true);
    try {
      // TODO: Implement API calls to create allowlist_batches and allowlist_batch_steps
      // const batchData = {
      //   batchName,
      //   inputsSchema: JSON.parse(inputsSchema),
      //   preflight: JSON.parse(preflight),
      //   active,
      // };

      // const stepsData = steps.map(step => ({
      //   stepIndex: step.stepIndex,
      //   commandId: step.commandId,
      //   paramsTemplate: JSON.parse(step.paramsTemplate),
      // }));

      toast({
        title: 'Success',
        description: editBatch ? 'Batch updated successfully' : 'Batch created successfully',
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save batch',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-[800px] sm:w-[800px] max-w-none overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editBatch ? 'Edit Batch' : 'New Batch'}</SheetTitle>
            <SheetDescription>
              {editBatch ? 'Update batch configuration' : 'Create a new command batch workflow'}
            </SheetDescription>
          </SheetHeader>

          <div className="mt-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium">Basic Information</h3>
              
              <div className="space-y-2">
                <Label htmlFor="batchName">Batch Name</Label>
                <Input
                  id="batchName"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  placeholder="unique-batch-name"
                />
              </div>

              <div className="flex items-center space-x-2">
                <Switch
                  id="active"
                  checked={active}
                  onCheckedChange={setActive}
                />
                <Label htmlFor="active">Active</Label>
              </div>

              {/* Validation Section */}
              <div className="space-y-3 p-4 border rounded-lg bg-muted/20">
                <div className="flex items-center justify-between">
                  <Label className="text-sm font-medium">Batch Validation</Label>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleValidate}
                    disabled={validating || !batchName.trim()}
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    {validating ? 'Validating...' : 'Validate'}
                  </Button>
                </div>
                
                {validationResult && (
                  <Alert className={validationResult.status === 'ok' ? 'border-success' : 'border-destructive'}>
                    <div className="flex items-center gap-2">
                      {validationResult.status === 'ok' ? (
                        <CheckCircle className="h-4 w-4 text-success" />
                      ) : (
                        <AlertCircle className="h-4 w-4 text-destructive" />
                      )}
                      <AlertDescription>
                        {validationResult.message}
                      </AlertDescription>
                    </div>
                  </Alert>
                )}
              </div>
            </div>

            {/* Configuration Tabs */}
            <Tabs defaultValue="inputs" className="space-y-4">
              <div>
                <h3 className="text-lg font-medium mb-2">Configuration</h3>
                <TabsList>
                  <TabsTrigger value="inputs">Inputs Schema</TabsTrigger>
                  <TabsTrigger value="preflight">Preflight</TabsTrigger>
                  <TabsTrigger value="steps">Steps</TabsTrigger>
                  <TabsTrigger value="preview">Preview</TabsTrigger>
                </TabsList>
              </div>

              <TabsContent value="inputs" className="space-y-4">
                <div>
                  <Label>Inputs Schema (JSON Schema)</Label>
                  <Textarea
                    value={inputsSchema}
                    onChange={(e) => setInputsSchema(e.target.value)}
                    className="font-mono text-sm min-h-[300px]"
                    placeholder="Define the JSON schema for batch inputs"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Define the input parameters required to run this batch
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="preflight" className="space-y-4">
                <div>
                  <Label>Preflight Checks (JSON)</Label>
                  <Textarea
                    value={preflight}
                    onChange={(e) => setPreflight(e.target.value)}
                    className="font-mono text-sm min-h-[200px]"
                    placeholder='{"min_ram_mb": 1024, "min_disk_free_gb": 10, "require_open_ports": [22, 80]}'
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    Define system requirements and checks before batch execution
                  </p>
                </div>
              </TabsContent>

              <TabsContent value="steps" className="space-y-4">
                <BatchStepEditor steps={steps} onStepsChange={setSteps} />
              </TabsContent>

              <TabsContent value="preview" className="space-y-6">
                <div className="grid gap-6 md:grid-cols-2">
                  <div>
                    {renderPreviewForm()}
                  </div>
                  <div>
                    {renderPreflightSummary()}
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Label>Batch Steps Summary</Label>
                    <Button variant="outline" size="sm" onClick={() => setPreviewOpen(true)}>
                      <Eye className="h-4 w-4 mr-2" />
                      Full Preview
                    </Button>
                  </div>
                  <div className="text-sm space-y-2">
                    {steps.length === 0 ? (
                      <p className="text-muted-foreground">No steps configured</p>
                    ) : (
                      steps.map((step, index) => (
                        <div key={step.id} className="flex items-center gap-2 p-2 border rounded">
                          <span className="font-medium">Step {index + 1}:</span>
                          <code className="text-xs bg-muted px-2 py-1 rounded">
                            {step.commandName || 'No command selected'}
                          </code>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex justify-end gap-2 pt-6 border-t">
              <Button
                variant="outline"
                onClick={() => onOpenChange(false)}
                disabled={loading}
              >
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={loading}
              >
                {loading ? 'Saving...' : editBatch ? 'Update Batch' : 'Create Batch'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Full Preview Dialog */}
      <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
        <DialogContent className="max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Batch Preview: {batchName}</DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            <div className="grid gap-6 md:grid-cols-2">
              <div>
                {renderPreviewForm()}
              </div>
              <div>
                {renderPreflightSummary()}
              </div>
            </div>
            
            <div>
              <h4 className="font-medium mb-3">Execution Steps</h4>
              <div className="space-y-3">
                {steps.map((step, index) => (
                  <div key={step.id} className="border rounded p-3">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">Step {index + 1}</span>
                      <code className="text-xs bg-muted px-2 py-1 rounded">
                        {step.commandName}
                      </code>
                    </div>
                    <pre className="text-xs bg-muted p-2 rounded overflow-x-auto">
                      <code>{step.paramsTemplate}</code>
                    </pre>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}