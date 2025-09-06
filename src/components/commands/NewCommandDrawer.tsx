import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useToast } from '@/hooks/use-toast';
import { SHABadge } from '@/components/scripts/SHABadge';
import { X, CheckCircle, AlertCircle, Shield, Info, Eye } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { api } from '@/lib/api-wrapper';

interface Script {
  id: string;
  name: string;
  versions: ScriptVersion[];
}

interface ScriptVersion {
  version: number;
  sha256: string;
  status: 'draft' | 'published';
}

interface NewCommandDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  editCommand?: any;
}

const mockScripts: Script[] = [
  {
    id: '1',
    name: 'System Update Script',
    versions: [
      { version: 1, sha256: 'a1b2c3d4e5f6', status: 'published' },
      { version: 2, sha256: 'b2c3d4e5f6a1', status: 'published' },
      { version: 3, sha256: 'c3d4e5f6a1b2', status: 'draft' },
    ],
  },
  {
    id: '2',
    name: 'Database Backup',
    versions: [
      { version: 1, sha256: 'd4e5f6a1b2c3', status: 'published' },
      { version: 2, sha256: 'e5f6a1b2c3d4', status: 'published' },
    ],
  },
];

const osOptions = ['windows', 'linux', 'macos', 'ubuntu', 'debian', 'centos', 'rhel'];
const riskLevels = ['low', 'medium', 'high'];

const allowedBinaries = {
  windows: ['cmd', 'powershell', 'wmic', 'sc', 'net', 'reg', 'tasklist', 'taskkill'],
  linux: ['apt', 'apt-get', 'yum', 'dnf', 'systemctl', 'service', 'ps', 'kill', 'grep', 'awk', 'sed'],
  ubuntu: ['apt', 'apt-get', 'systemctl', 'service', 'ps', 'kill', 'grep', 'awk', 'sed'],
  debian: ['apt', 'apt-get', 'systemctl', 'service', 'ps', 'kill', 'grep', 'awk', 'sed'],
  centos: ['yum', 'dnf', 'systemctl', 'service', 'ps', 'kill', 'grep', 'awk', 'sed'],
  rhel: ['yum', 'dnf', 'systemctl', 'service', 'ps', 'kill', 'grep', 'awk', 'sed'],
  macos: ['brew', 'launchctl', 'ps', 'kill', 'grep', 'awk', 'sed']
};

const forbiddenChars = [';', '|', '`', '$()'];

export function NewCommandDrawer({ open, onOpenChange, onSuccess, editCommand }: NewCommandDrawerProps) {
  const [execType, setExecType] = useState<'script' | 'command'>('script');
  const [commandName, setCommandName] = useState('');
  const [selectedScript, setSelectedScript] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [expectedSHA, setExpectedSHA] = useState('');
  const [cmdTemplate, setCmdTemplate] = useState('');
  const [osWhitelist, setOsWhitelist] = useState<string[]>([]);
  const [minAgentVersion, setMinAgentVersion] = useState('');
  const [timeoutSec, setTimeoutSec] = useState(300);
  const [risk, setRisk] = useState('medium');
  const [active, setActive] = useState(true);
  const [jsonSchema, setJsonSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "example": {\n      "type": "string",\n      "description": "Example parameter"\n    }\n  },\n  "required": ["example"]\n}');
  const [defaults, setDefaults] = useState('{\n  "example": "default_value"\n}');
  const [loading, setLoading] = useState(false);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<{status: 'ok' | 'error', message: string} | null>(null);
  const [templatePreview, setTemplatePreview] = useState('');
  const { toast } = useToast();

  // Auto-fill SHA when script/version changes
  useEffect(() => {
    if (selectedScript && selectedVersion) {
      const script = mockScripts.find(s => s.id === selectedScript);
      const version = script?.versions.find(v => v.version.toString() === selectedVersion);
      if (version) {
        setExpectedSHA(version.sha256);
      }
    }
  }, [selectedScript, selectedVersion]);

  // Reset form or populate for editing
  useEffect(() => {
    if (editCommand) {
      setExecType(editCommand.execType || 'script');
      setCommandName(editCommand.commandName);
      setSelectedScript(editCommand.scriptId);
      setSelectedVersion(editCommand.scriptVersion?.toString());
      setExpectedSHA(editCommand.expectedSHA);
      setCmdTemplate(editCommand.cmdTemplate || '');
      setOsWhitelist(editCommand.osWhitelist || []);
      setMinAgentVersion(editCommand.minAgentVersion || '');
      setTimeoutSec(editCommand.timeoutSec || 300);
      setRisk(editCommand.risk);
      setActive(editCommand.active);
      // TODO: Load existing param schema and defaults
    } else {
      resetForm();
    }
  }, [editCommand, open]);

  const resetForm = () => {
    setExecType('script');
    setCommandName('');
    setSelectedScript('');
    setSelectedVersion('');
    setExpectedSHA('');
    setCmdTemplate('');
    setOsWhitelist([]);
    setMinAgentVersion('');
    setTimeoutSec(300);
    setRisk('medium');
    setActive(true);
    setJsonSchema('{\n  "type": "object",\n  "properties": {\n    "example": {\n      "type": "string",\n      "description": "Example parameter"\n    }\n  },\n  "required": ["example"]\n}');
    setDefaults('{\n  "example": "default_value"\n}');
    setTemplatePreview('');
  };

  const handleOsAdd = (os: string) => {
    if (!osWhitelist.includes(os)) {
      const newOsList = [...osWhitelist, os];
      setOsWhitelist(newOsList);
      
      // Auto-set default command template for Command Line mode
      if (execType === 'command' && !cmdTemplate && (os === 'ubuntu' || os === 'debian')) {
        setCmdTemplate('apt update && apt upgrade -y');
      }
    }
  };

  const handleOsRemove = (os: string) => {
    setOsWhitelist(osWhitelist.filter(o => o !== os));
  };

  const validateCmdTemplate = (template: string) => {
    if (!template.trim()) return { isValid: false, error: 'Template is required' };
    
    // Check for forbidden characters
    const hasForbidden = forbiddenChars.some(char => {
      if (char === '$()') {
        return template.includes('$(') || template.includes('`');
      }
      return template.includes(char);
    });
    
    if (hasForbidden) {
      return { isValid: false, error: 'Template contains forbidden characters: ; | ` $() > < newlines' };
    }
    
    // Check for newlines
    if (template.includes('\n')) {
      return { isValid: false, error: 'Template must be a single line' };
    }
    
    // Check first token is allowed binary
    const firstToken = template.trim().split(' ')[0];
    const allowedForOS = osWhitelist.length > 0 
      ? osWhitelist.flatMap(os => allowedBinaries[os] || [])
      : Object.values(allowedBinaries).flat();
    
    if (!allowedForOS.includes(firstToken)) {
      return { isValid: false, error: `First binary '${firstToken}' not allowed for selected OS` };
    }
    
    return { isValid: true, error: '' };
  };

  const handleTemplatePreview = () => {
    try {
      const params = JSON.parse(defaults);
      let preview = cmdTemplate;
      
      // Replace ${param} placeholders with values
      Object.entries(params).forEach(([key, value]) => {
        const regex = new RegExp(`\\$\\{${key}\\}`, 'g');
        preview = preview.replace(regex, String(value));
      });
      
      setTemplatePreview(preview);
    } catch (error) {
      setTemplatePreview('Invalid JSON in defaults - cannot preview');
    }
  };

  const renderPreviewForm = () => {
    try {
      const schema = JSON.parse(jsonSchema);
      const defaultValues = JSON.parse(defaults);
      
      if (schema.type === 'object' && schema.properties) {
        return (
          <div className="space-y-3">
            <h4 className="font-medium">Form Preview</h4>
            {Object.entries(schema.properties).map(([key, prop]: [string, any]) => (
              <div key={key} className="space-y-1">
                <Label>{key} {schema.required?.includes(key) && <span className="text-destructive">*</span>}</Label>
                <Input 
                  placeholder={prop.description || `Enter ${key}`}
                  defaultValue={defaultValues[key] || ''}
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

  const handleValidate = async () => {
    if (!commandName.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Command name is required for validation',
        variant: 'destructive',
      });
      return;
    }

    setValidating(true);
    setValidationResult(null);

    try {
      // Sample agent snapshot for validation
      const agentSnapshot = {
        os: osWhitelist.length > 0 ? osWhitelist[0] : 'linux',
        agent_version: '1.0.0',
        ram_mb: 2048,
        disk_free_gb: 20,
        open_ports: [22, 80, 443]
      };

      // Sample parameters based on defaults
      let sampleParams = {};
      try {
        sampleParams = JSON.parse(defaults);
      } catch (error) {
        sampleParams = { example: 'test_value' };
      }

      const { data, error } = await api.invokeFunction('validate-command', {
          command_name: commandName,
          params: sampleParams,
          agent_snapshot: agentSnapshot
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
    // Validation based on exec type
    if (execType === 'script') {
      if (!commandName.trim() || !selectedScript || !selectedVersion) {
        toast({
          title: 'Validation Error',
          description: 'Command name, script, and version are required for Script mode',
          variant: 'destructive',
        });
        return;
      }
    } else if (execType === 'command') {
      if (!commandName.trim() || !cmdTemplate.trim()) {
        toast({
          title: 'Validation Error',
          description: 'Command name and template are required for Command Line mode',
          variant: 'destructive',
        });
        return;
      }
      
      const templateValidation = validateCmdTemplate(cmdTemplate);
      if (!templateValidation.isValid) {
        toast({
          title: 'Validation Error',
          description: templateValidation.error,
          variant: 'destructive',
        });
        return;
      }
    }

    // Validate JSON schema
    try {
      JSON.parse(jsonSchema);
      JSON.parse(defaults);
    } catch (error) {
      toast({
        title: 'Validation Error',
        description: 'Parameter Schema and Defaults must be valid JSON',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API calls to create/update allowlist_commands and allowlist_command_params
      const commandData = {
        commandName,
        execType,
        ...(execType === 'script' ? {
          scriptId: selectedScript,
          scriptVersion: parseInt(selectedVersion),
          expectedSHA,
        } : {
          cmdTemplate,
        }),
        osWhitelist: osWhitelist.length > 0 ? osWhitelist : null,
        minAgentVersion: minAgentVersion || null,
        timeoutSec,
        risk,
        active,
      };

      const paramsData = {
        jsonSchema: JSON.parse(jsonSchema),
        defaults: JSON.parse(defaults),
      };

      console.log('Command data:', commandData);
      console.log('Params data:', paramsData);

      toast({
        title: 'Success',
        description: editCommand ? 'Command updated successfully' : 'Command created successfully',
      });

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to save command',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[600px] sm:w-[600px] max-w-none overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{editCommand ? 'Edit Command' : 'New Command'}</SheetTitle>
          <SheetDescription>
            {editCommand ? 'Update command configuration' : 'Create a new allowlist command'}
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Basic Information */}
          <div className="space-y-4">
            <h3 className="text-lg font-medium">Basic Information</h3>
            
            <div className="space-y-2">
              <Label htmlFor="commandName">Command Name</Label>
              <Input
                id="commandName"
                value={commandName}
                onChange={(e) => setCommandName(e.target.value)}
                placeholder="unique-command-name"
              />
            </div>

            {/* Execution Type */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <Label>Execution Type</Label>
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger>
                      <Info className="h-4 w-4 text-muted-foreground" />
                    </TooltipTrigger>
                    <TooltipContent>
                      <p className="max-w-xs">Command Line is a locked one line template with strict validation for security</p>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </div>
              <RadioGroup value={execType} onValueChange={(value: 'script' | 'command') => setExecType(value)}>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="script" id="script" />
                  <Label htmlFor="script">Script</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="command" id="command" />
                  <Label htmlFor="command">Command Line</Label>
                </div>
              </RadioGroup>
            </div>

            {/* Script Fields - Only show if execType is 'script' */}
            {execType === 'script' && (
              <>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Script</Label>
                    <Select value={selectedScript} onValueChange={setSelectedScript}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select script" />
                      </SelectTrigger>
                      <SelectContent>
                        {mockScripts.map((script) => (
                          <SelectItem key={script.id} value={script.id}>
                            {script.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Version</Label>
                    <Select 
                      value={selectedVersion} 
                      onValueChange={setSelectedVersion}
                      disabled={!selectedScript}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select version" />
                      </SelectTrigger>
                      <SelectContent>
                        {selectedScript && mockScripts
                          .find(s => s.id === selectedScript)
                          ?.versions.map((version) => (
                            <SelectItem key={version.version} value={version.version.toString()}>
                              v{version.version} ({version.status})
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                {expectedSHA && (
                  <div className="space-y-2">
                    <Label>Expected SHA256</Label>
                    <div>
                      <SHABadge sha256={expectedSHA} />
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Command Line Fields - Only show if execType is 'command' */}
            {execType === 'command' && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Command Template</Label>
                  <Textarea
                    value={cmdTemplate}
                    onChange={(e) => setCmdTemplate(e.target.value)}
                    className="font-mono text-sm"
                    placeholder="apt update && apt upgrade -y"
                    rows={3}
                  />
                  {(() => {
                    const validation = validateCmdTemplate(cmdTemplate);
                    return !validation.isValid && cmdTemplate && (
                      <div className="text-sm text-destructive">{validation.error}</div>
                    );
                  })()}
                </div>
                
                <div className="p-3 bg-muted/50 rounded-lg space-y-2">
                  <h4 className="text-sm font-medium">Validation Rules</h4>
                  <ul className="text-xs text-muted-foreground space-y-1">
                    <li>• Forbidden characters: ; | ` $() &gt; &lt; newlines</li>
                    <li>• First binary must be approved for selected OS</li>
                    <li>• Single line only</li>
                    <li>• Use ${'{param}'} for parameter substitution</li>
                  </ul>
                </div>

                {cmdTemplate && (
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleTemplatePreview}
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      Preview
                    </Button>
                  </div>
                )}

                {templatePreview && (
                  <div className="space-y-2">
                    <Label>Preview with Sample Params</Label>
                    <div className="p-3 bg-muted font-mono text-sm rounded">
                      {templatePreview}
                    </div>
                  </div>
                )}
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Risk Level</Label>
                <Select value={risk} onValueChange={setRisk}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {riskLevels.map((level) => (
                      <SelectItem key={level} value={level}>
                        {level.charAt(0).toUpperCase() + level.slice(1)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Timeout (seconds)</Label>
                <Input
                  type="number"
                  value={timeoutSec}
                  onChange={(e) => setTimeoutSec(parseInt(e.target.value) || 300)}
                  min={1}
                  max={3600}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Min Agent Version (optional)</Label>
              <Input
                value={minAgentVersion}
                onChange={(e) => setMinAgentVersion(e.target.value)}
                placeholder="1.0.0"
              />
            </div>

            <div className="space-y-2">
              <Label>OS Whitelist</Label>
              <Select onValueChange={handleOsAdd}>
                <SelectTrigger>
                  <SelectValue placeholder="Add OS to whitelist" />
                </SelectTrigger>
                <SelectContent>
                  {osOptions
                    .filter(os => !osWhitelist.includes(os))
                    .map((os) => (
                      <SelectItem key={os} value={os}>
                        {os}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
              {osWhitelist.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-2">
                  {osWhitelist.map((os) => (
                    <Badge key={os} variant="secondary" className="gap-1">
                      {os}
                      <X 
                        className="h-3 w-3 cursor-pointer" 
                        onClick={() => handleOsRemove(os)}
                      />
                    </Badge>
                  ))}
                </div>
              )}
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
                <Label className="text-sm font-medium">Command Validation</Label>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleValidate}
                  disabled={validating || !commandName.trim()}
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

          {/* Parameter Configuration */}
          <Tabs defaultValue="schema" className="space-y-4">
            <div>
              <h3 className="text-lg font-medium mb-2">Parameter Configuration</h3>
              <TabsList>
                <TabsTrigger value="schema">JSON Schema</TabsTrigger>
                <TabsTrigger value="defaults">Defaults</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
            </div>

            <TabsContent value="schema" className="space-y-2">
              <Label>Parameter Schema (JSON)</Label>
              <Textarea
                value={jsonSchema}
                onChange={(e) => setJsonSchema(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="Enter JSON schema for command parameters"
              />
            </TabsContent>

            <TabsContent value="defaults" className="space-y-2">
              <Label>Default Values (JSON)</Label>
              <Textarea
                value={defaults}
                onChange={(e) => setDefaults(e.target.value)}
                className="font-mono text-sm min-h-[200px]"
                placeholder="Enter default values for parameters"
              />
            </TabsContent>

            <TabsContent value="preview" className="space-y-2">
              {renderPreviewForm()}
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
              disabled={loading || (execType === 'script' && (!commandName.trim() || !selectedScript || !selectedVersion)) || (execType === 'command' && (!commandName.trim() || !cmdTemplate.trim() || !validateCmdTemplate(cmdTemplate).isValid))}
            >
              {loading ? 'Saving...' : editCommand ? 'Update Command' : 'Create Command'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}