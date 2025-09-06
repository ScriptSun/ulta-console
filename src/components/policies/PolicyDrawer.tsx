import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Separator } from '@/components/ui/separator';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Info, Eye } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { ScrollArea } from '@/components/ui/scroll-area';
import { api } from '@/lib/api-wrapper';
import { useToast } from '@/hooks/use-toast';

interface PolicyFormData {
  policy_name: string;
  mode: 'auto' | 'confirm' | 'forbid';
  match_type: 'exact' | 'regex' | 'wildcard';
  match_value: string;
  risk: 'low' | 'medium' | 'high' | 'critical';
  timeout_sec: number | null;
  param_schema: string;
  confirm_message: string;
  active: boolean;
}

interface CommandPolicy {
  id: string;
  policy_name: string;
  mode: 'auto' | 'confirm' | 'forbid';
  match_type: 'exact' | 'regex' | 'wildcard';
  match_value: string;
  os_whitelist: string[] | null;
  risk: 'low' | 'medium' | 'high' | 'critical';
  timeout_sec: number | null;
  param_schema: any;
  confirm_message: string | null;
  active: boolean;
  updated_at: string;
}

interface PolicyDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  policy?: CommandPolicy | null;
  onSave?: () => void;
}

const defaultFormData: PolicyFormData = {
  policy_name: '',
  mode: 'confirm',
  match_type: 'exact',
  match_value: '',
  risk: 'medium',
  timeout_sec: 300,
  param_schema: '{\n  "type": "object",\n  "properties": {\n    "path": {\n      "type": "string",\n      "description": "File or directory path",\n      "pattern": "^(/[^/\\\\0]+)*/?$"\n    },\n    "force": {\n      "type": "boolean",\n      "description": "Force operation without confirmation",\n      "default": false\n    },\n    "timeout": {\n      "type": "integer",\n      "description": "Timeout in seconds",\n      "minimum": 1,\n      "maximum": 3600,\n      "default": 30\n    }\n  },\n  "required": ["path"],\n  "additionalProperties": false\n}',
  confirm_message: '',
  active: true,
};

const schemaPresets = [
  {
    name: 'File Operations',
    schema: {
      type: 'object',
      properties: {
        path: {
          type: 'string',
          description: 'File or directory path',
          pattern: '^(/[^/\\\\0]+)*/?$'
        },
        force: {
          type: 'boolean',
          description: 'Force operation without confirmation',
          default: false
        },
        recursive: {
          type: 'boolean',
          description: 'Apply recursively',
          default: false
        }
      },
      required: ['path'],
      additionalProperties: false
    }
  },
  {
    name: 'System Commands',
    schema: {
      type: 'object',
      properties: {
        command: {
          type: 'string',
          description: 'Command to execute',
          minLength: 1
        },
        args: {
          type: 'array',
          description: 'Command arguments',
          items: { type: 'string' },
          maxItems: 20
        },
        timeout: {
          type: 'integer',
          description: 'Timeout in seconds',
          minimum: 1,
          maximum: 3600,
          default: 30
        }
      },
      required: ['command'],
      additionalProperties: false
    }
  },
  {
    name: 'Network Operations',
    schema: {
      type: 'object',
      properties: {
        host: {
          type: 'string',
          description: 'Target hostname or IP',
          pattern: '^[a-zA-Z0-9.-]+$'
        },
        port: {
          type: 'integer',
          description: 'Port number',
          minimum: 1,
          maximum: 65535
        },
        protocol: {
          type: 'string',
          description: 'Protocol to use',
          enum: ['tcp', 'udp', 'http', 'https']
        }
      },
      required: ['host'],
      additionalProperties: false
    }
  },
  {
    name: 'User Management',
    schema: {
      type: 'object',
      properties: {
        username: {
          type: 'string',
          description: 'Username',
          pattern: '^[a-zA-Z0-9_-]+$',
          minLength: 3,
          maxLength: 32
        },
        groups: {
          type: 'array',
          description: 'User groups',
          items: { type: 'string' },
          uniqueItems: true
        },
        shell: {
          type: 'string',
          description: 'Default shell',
          default: '/bin/bash'
        }
      },
      required: ['username'],
      additionalProperties: false
    }
  }
];

export function PolicyDrawer({ open, onOpenChange, policy, onSave }: PolicyDrawerProps) {
  const [formData, setFormData] = useState<PolicyFormData>(defaultFormData);
  const [schemaPreview, setSchemaPreview] = useState<any>(null);
  const [schemaError, setSchemaError] = useState<string>('');
  const { toast } = useToast();

  const isEditing = !!policy;

  useEffect(() => {
    if (policy) {
      setFormData({
        policy_name: policy.policy_name,
        mode: policy.mode,
        match_type: policy.match_type,
        match_value: policy.match_value,
        risk: policy.risk,
        timeout_sec: policy.timeout_sec,
        param_schema: policy.param_schema ? JSON.stringify(policy.param_schema, null, 2) : defaultFormData.param_schema,
        confirm_message: policy.confirm_message || '',
        active: policy.active,
      });
    } else {
      setFormData(defaultFormData);
    }
  }, [policy]);

  useEffect(() => {
    try {
      const parsed = JSON.parse(formData.param_schema);
      setSchemaPreview(parsed);
      setSchemaError('');
    } catch (error) {
      setSchemaPreview(null);
      setSchemaError('Invalid JSON schema');
    }
  }, [formData.param_schema]);

  const handleInputChange = (field: keyof PolicyFormData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const applySchemaPreset = (preset: any) => {
    const schemaString = JSON.stringify(preset.schema, null, 2);
    handleInputChange('param_schema', schemaString);
  };

  const handleSave = async () => {
    if (!isFormValid()) return;

    try {
      // Parse the JSON schema
      let parsedSchema;
      try {
        parsedSchema = JSON.parse(formData.param_schema);
      } catch (error) {
        console.error('Invalid JSON schema:', error);
        return;
      }

      const policyData = {
        policy_name: formData.policy_name.trim(),
        mode: formData.mode,
        match_type: formData.match_type,
        match_value: formData.match_value.trim(),
        risk: formData.risk,
        timeout_sec: formData.timeout_sec,
        param_schema: parsedSchema,
        confirm_message: formData.confirm_message.trim() || null,
        active: formData.active,
        updated_at: new Date().toISOString()
      };

      let result;
      if (isEditing && policy?.id) {
        // Update existing policy
        result = await api
          .from('command_policies')
          .update(policyData)
          .eq('id', policy.id);
      } else {
        // Create new policy (customer_id and created_by handled by RLS)
        result = await api
          .from('command_policies')
          .insert([policyData]);
      }

      if (result.error) {
        console.error('Error saving policy:', result.error);
        toast({
          title: "Error",
          description: "Failed to save policy. Please try again.",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Policy ${isEditing ? 'updated' : 'created'} successfully.`,
      });

      onOpenChange(false);
      if (onSave) {
        onSave();
      }
    } catch (error) {
      console.error('Error saving policy:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };

  const isFormValid = () => {
    return (
      formData.policy_name.trim() !== '' &&
      formData.match_value.trim() !== '' &&
      schemaError === ''
    );
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="!w-1/2 !max-w-none overflow-hidden">
        <SheetHeader className="border-b pb-4">
          <SheetTitle>
            {isEditing ? 'Edit Policy' : 'New Policy'}
          </SheetTitle>
          <SheetDescription>
            Configure command execution policy settings
          </SheetDescription>
        </SheetHeader>

        <ScrollArea className="flex-1 h-[calc(100vh-200px)]">
          <div className="p-6 space-y-6 pb-0">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Basic Information</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="policy_name">Policy Name</Label>
                <Input
                  id="policy_name"
                  value={formData.policy_name}
                  onChange={(e) => handleInputChange('policy_name', e.target.value)}
                  placeholder="Enter policy name"
                />
              </div>

              <div className="space-y-2">
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Label htmlFor="mode" className="flex items-center gap-2">
                        Mode
                        <Info className="h-3 w-3" />
                      </Label>
                    </TooltipTrigger>
                    <TooltipContent>
                      <p>Auto: Execute immediately | Confirm: Require approval | Forbid: Block execution</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
                <RadioGroup
                  value={formData.mode}
                  onValueChange={(value) => handleInputChange('mode', value)}
                  className="flex gap-6"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="auto" id="auto" />
                    <Label htmlFor="auto">Auto</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="confirm" id="confirm" />
                    <Label htmlFor="confirm">Confirm</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="forbid" id="forbid" />
                    <Label htmlFor="forbid">Forbid</Label>
                  </div>
                </RadioGroup>
              </div>
            </div>
          </div>

          <Separator />

          {/* Match Configuration */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Match Configuration</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="match_type">Match Type</Label>
                <Select
                  value={formData.match_type}
                  onValueChange={(value) => handleInputChange('match_type', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="exact">Exact</SelectItem>
                    <SelectItem value="regex">Regex</SelectItem>
                    <SelectItem value="wildcard">Wildcard</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="risk">Risk Level</Label>
                <Select
                  value={formData.risk}
                  onValueChange={(value) => handleInputChange('risk', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="match_value">Match Value</Label>
              <Textarea
                id="match_value"
                value={formData.match_value}
                onChange={(e) => handleInputChange('match_value', e.target.value)}
                placeholder="Enter command pattern"
                className="font-mono text-sm"
                rows={3}
              />
            </div>
          </div>

          <Separator />

          {/* Additional Settings */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Additional Settings</h3>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="timeout_sec">Timeout (seconds)</Label>
                <Input
                  id="timeout_sec"
                  type="number"
                  value={formData.timeout_sec || ''}
                  onChange={(e) => handleInputChange('timeout_sec', e.target.value ? parseInt(e.target.value) : null)}
                  placeholder="300"
                />
              </div>

              <div className="flex items-center space-x-2 pt-6">
                <Switch
                  id="active"
                  checked={formData.active}
                  onCheckedChange={(checked) => handleInputChange('active', checked)}
                />
                <Label htmlFor="active">Active</Label>
              </div>
            </div>

            {formData.mode === 'confirm' && (
              <div className="space-y-2">
                <Label htmlFor="confirm_message">Confirmation Message</Label>
                <Textarea
                  id="confirm_message"
                  value={formData.confirm_message}
                  onChange={(e) => handleInputChange('confirm_message', e.target.value)}
                  placeholder="Enter message to show when confirmation is required"
                  rows={2}
                />
              </div>
            )}
          </div>

          <Separator />

          {/* Parameter Schema */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold">Parameter Schema</h3>
              <div className="flex gap-2">
                {schemaPresets.map((preset, index) => (
                  <Button
                    key={index}
                    variant="outline"
                    size="sm"
                    onClick={() => applySchemaPreset(preset)}
                  >
                    {preset.name}
                  </Button>
                ))}
                <Button variant="outline" size="sm">
                  <Eye className="mr-2 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="param_schema">JSON Schema</Label>
                <Textarea
                  id="param_schema"
                  value={formData.param_schema}
                  onChange={(e) => handleInputChange('param_schema', e.target.value)}
                  className="font-mono text-sm h-[300px] resize-none"
                  rows={8}
                />
                {schemaError && (
                  <p className="text-sm text-destructive">{schemaError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <Card className="h-[300px]">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Schema Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0 h-[calc(100%-60px)] overflow-auto">
                    {schemaPreview ? (
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto h-full">
                        {JSON.stringify(schemaPreview, null, 2)}
                      </pre>
                    ) : (
                      <p className="text-sm text-muted-foreground">Invalid schema</p>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            </div>
          </div>
        </ScrollArea>

        <div className="border-t p-6 flex justify-end gap-3">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={!isFormValid()}>
            {isEditing ? 'Update Policy' : 'Create Policy'}
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}