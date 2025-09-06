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

interface PolicyFormData {
  policy_name: string;
  mode: 'auto' | 'confirm' | 'forbid';
  match_type: 'exact' | 'regex' | 'wildcard';
  match_value: string;
  os_whitelist: string[];
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
  os_whitelist: [],
  risk: 'medium',
  timeout_sec: 300,
  param_schema: '{\n  "type": "object",\n  "properties": {}\n}',
  confirm_message: '',
  active: true,
};

const osOptions = [
  { value: 'ubuntu', label: 'Ubuntu' },
  { value: 'debian', label: 'Debian' },
  { value: 'centos', label: 'CentOS' },
  { value: 'rhel', label: 'RHEL' },
  { value: 'windows', label: 'Windows' },
  { value: 'macos', label: 'macOS' },
];

export function PolicyDrawer({ open, onOpenChange, policy, onSave }: PolicyDrawerProps) {
  const [formData, setFormData] = useState<PolicyFormData>(defaultFormData);
  const [schemaPreview, setSchemaPreview] = useState<any>(null);
  const [schemaError, setSchemaError] = useState<string>('');

  const isEditing = !!policy;

  useEffect(() => {
    if (policy) {
      setFormData({
        policy_name: policy.policy_name,
        mode: policy.mode,
        match_type: policy.match_type,
        match_value: policy.match_value,
        os_whitelist: policy.os_whitelist || [],
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

  const handleOSToggle = (os: string) => {
    const newOsList = formData.os_whitelist.includes(os)
      ? formData.os_whitelist.filter(item => item !== os)
      : [...formData.os_whitelist, os];
    
    handleInputChange('os_whitelist', newOsList);
  };

  const handleSave = () => {
    console.log('Saving policy:', formData);
    onOpenChange(false);
    if (onSave) {
      onSave();
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

        <div className="flex-1 overflow-y-auto p-6 space-y-6">
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

          {/* OS Whitelist */}
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">OS Whitelist</h3>
            <div className="grid grid-cols-3 gap-2">
              {osOptions.map((os) => (
                <div
                  key={os.value}
                  onClick={() => handleOSToggle(os.value)}
                  className={`cursor-pointer p-3 rounded-lg border transition-colors ${
                    formData.os_whitelist.includes(os.value)
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:bg-muted'
                  }`}
                >
                  <div className="text-sm font-medium">{os.label}</div>
                </div>
              ))}
            </div>
            {formData.os_whitelist.length === 0 && (
              <p className="text-sm text-muted-foreground">No OS restrictions (applies to all)</p>
            )}
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
              <Button variant="outline" size="sm">
                <Eye className="mr-2 h-4 w-4" />
                Preview
              </Button>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="param_schema">JSON Schema</Label>
                <Textarea
                  id="param_schema"
                  value={formData.param_schema}
                  onChange={(e) => handleInputChange('param_schema', e.target.value)}
                  className="font-mono text-sm"
                  rows={8}
                />
                {schemaError && (
                  <p className="text-sm text-destructive">{schemaError}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Preview</Label>
                <Card>
                  <CardHeader className="pb-3">
                    <CardTitle className="text-sm">Schema Preview</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-0">
                    {schemaPreview ? (
                      <pre className="text-xs bg-muted p-3 rounded overflow-auto">
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

          <div className="border-t pt-6 flex justify-end gap-3">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!isFormValid()}>
              {isEditing ? 'Update Policy' : 'Create Policy'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}