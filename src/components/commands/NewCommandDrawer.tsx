import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
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
import { X } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

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

export function NewCommandDrawer({ open, onOpenChange, onSuccess, editCommand }: NewCommandDrawerProps) {
  const [commandName, setCommandName] = useState('');
  const [selectedScript, setSelectedScript] = useState('');
  const [selectedVersion, setSelectedVersion] = useState('');
  const [expectedSHA, setExpectedSHA] = useState('');
  const [osWhitelist, setOsWhitelist] = useState<string[]>([]);
  const [minAgentVersion, setMinAgentVersion] = useState('');
  const [timeoutSec, setTimeoutSec] = useState(300);
  const [risk, setRisk] = useState('medium');
  const [active, setActive] = useState(true);
  const [jsonSchema, setJsonSchema] = useState('{\n  "type": "object",\n  "properties": {\n    "example": {\n      "type": "string",\n      "description": "Example parameter"\n    }\n  },\n  "required": ["example"]\n}');
  const [defaults, setDefaults] = useState('{\n  "example": "default_value"\n}');
  const [loading, setLoading] = useState(false);
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
      setCommandName(editCommand.commandName);
      setSelectedScript(editCommand.scriptId);
      setSelectedVersion(editCommand.scriptVersion.toString());
      setExpectedSHA(editCommand.expectedSHA);
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
    setCommandName('');
    setSelectedScript('');
    setSelectedVersion('');
    setExpectedSHA('');
    setOsWhitelist([]);
    setMinAgentVersion('');
    setTimeoutSec(300);
    setRisk('medium');
    setActive(true);
    setJsonSchema('{\n  "type": "object",\n  "properties": {\n    "example": {\n      "type": "string",\n      "description": "Example parameter"\n    }\n  },\n  "required": ["example"]\n}');
    setDefaults('{\n  "example": "default_value"\n}');
  };

  const handleOsAdd = (os: string) => {
    if (!osWhitelist.includes(os)) {
      setOsWhitelist([...osWhitelist, os]);
    }
  };

  const handleOsRemove = (os: string) => {
    setOsWhitelist(osWhitelist.filter(o => o !== os));
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

  const handleSave = async () => {
    if (!commandName.trim() || !selectedScript || !selectedVersion) {
      toast({
        title: 'Validation Error',
        description: 'Command name, script, and version are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API calls to create/update allowlist_commands and allowlist_command_params
      // const commandData = {
      //   commandName,
      //   scriptId: selectedScript,
      //   scriptVersion: parseInt(selectedVersion),
      //   expectedSHA,
      //   osWhitelist: osWhitelist.length > 0 ? osWhitelist : null,
      //   minAgentVersion: minAgentVersion || null,
      //   timeoutSec,
      //   risk,
      //   active,
      // };

      // const paramsData = {
      //   jsonSchema: JSON.parse(jsonSchema),
      //   defaults: JSON.parse(defaults),
      // };

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
              disabled={loading}
            >
              {loading ? 'Saving...' : editCommand ? 'Update Command' : 'Create Command'}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}