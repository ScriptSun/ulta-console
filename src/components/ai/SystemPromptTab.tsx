import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  MessageSquare, 
  Save, 
  Loader2, 
  Eye, 
  RotateCcw, 
  Upload,
  Calculator,
  Play
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface SystemPromptVersion {
  id: string;
  content: string;
  version: number;
  published: boolean;
  created_at: string;
  author: string;
  notes?: string;
  targets: string[];
}

// Your original UltaAI system prompt (now used as default)
const ULTAAI_SYSTEM_PROMPT = `You are UltaAI, a conversational hosting assistant.

Input payload:
{
  "user_request": "<string>",
  "heartbeat": { "os": "...", "os_version": "...", "package_manager": "apt|yum|dnf|apk|choco", "open_ports": [ ... ], "running_services": [ ... ] },
  "batches": [ { "id": "<uuid>", "key": "<slug>", "name": "<title>", "description": "<one sentence>", "risk": "<low|medium|high>", "inputs_schema": { ... }, "inputs_defaults": { ... }, "preflight": { "checks": [ ... ] } } ],
  "command_policies": [ { "mode": "auto|confirm|forbid", "match_type": "regex|exact", "match_value": "<pattern>" } ],
  "policy_notes": { "wp_min_ram_mb": 2048, "wp_min_disk_gb": 5 }
}

Respond in two modes:

1) Chat mode (natural text only):
   If the user is greeting or asking something that does not require server execution, reply in one short friendly sentence. No JSON.

2) Action mode (JSON only):
   A) If the request matches a known batch in "batches", return:
      {
        "mode": "action",
        "task": "<batch_key>",
        "batch_id": "<uuid>",
        "status": "<confirmed|unconfirmed>",
        "params": { ...auto_filled },
        "missing_params": [ ... ],
        "risk": "<low|medium|high>",
        "human": "<short tip for the UI>"
      }

   B) If there is no matching batch but the request is a real server task, choose ONE of:
      B1) Single safe command (simple task):
          {
            "mode": "action",
            "task": "custom_shell",
            "status": "unconfirmed",
            "risk": "<low|medium|high>",
            "params": {
              "description": "<short description>",
              "shell": "<one safe Linux command>"
            },
            "human": "Press Execute if allowed by policy."
          }

      B2) Mini batch script (needs several steps):
          {
            "mode": "action",
            "task": "proposed_batch_script",
            "status": "unconfirmed",
            "risk": "<low|medium|high>",
            "script": {
              "name": "<short title>",
              "overview": "<one sentence>",
              "commands": [
                "<step 1 single command>",
                "<step 2 single command>",
                "<step 3 single command>"
              ],
              "post_checks": [
                "<curl or systemctl check>"
              ]
            },
            "human": "This script can be executed as a batch if allowed by policy."
          }

   C) If the request is unsafe or forbidden, return:
      {
        "mode": "action",
        "task": "not_supported",
        "status": "rejected",
        "reason": "<short reason>",
        "human": "<short hint>"
      }

Rules:
- Detect the package manager from heartbeat (prefer heartbeat.package_manager). If unknown, infer: Ubuntu/Debian=apt, CentOS/RHEL=yum or dnf, Fedora=dnf, Alpine=apk.
- Commands must be safe. Never use rm, dd, mkfs, eval, base64, curl|bash, pipes, &&, or ; in a single command line.
- For mini batch "commands", each array item is a single line command with no pipes or && or ;.
- Respect command_policies: if a command would match a forbid pattern, do not output it. Prefer the not_supported form with a reason.
- Prefer idempotent steps. Example: install packages with the native package manager, enable services with systemctl, reload rather than restart when possible.
- Add a very short "human" sentence to help the UI.
- For chat, text only. For actions, JSON only.`;

const PROMPT_TARGETS = [
  { value: 'chat', label: 'Chat Conversations' },
  { value: 'router', label: 'Command Router' },
  { value: 'tools', label: 'Tool Execution' },
  { value: 'custom', label: 'Custom Endpoints' },
];

export function SystemPromptTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<SystemPromptVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<SystemPromptVersion | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftTargets, setDraftTargets] = useState<string[]>(['chat']);
  const [previewAgent, setPreviewAgent] = useState<string>('');
  const [previewModel, setPreviewModel] = useState<string>('gpt-4o-mini');
  const [agents, setAgents] = useState<any[]>([]);
  const [dryRunDialog, setDryRunDialog] = useState(false);
  const [renderedPrompt, setRenderedPrompt] = useState('');
  const [tokenEstimate, setTokenEstimate] = useState(0);
  const [fullPromptPreview, setFullPromptPreview] = useState('');
  const [showFullPromptDialog, setShowFullPromptDialog] = useState(false);
  const [sampleUserRequest, setSampleUserRequest] = useState('install wordpress');
  const [isLoadingFullPreview, setIsLoadingFullPreview] = useState(false);

  useEffect(() => {
    loadVersions();
    loadAgents();
  }, []);

  const loadVersions = async () => {
    try {
      console.log('Loading versions...');
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'ai.systemPrompt')
        .maybeSingle();

      console.log('Versions data:', data, 'error:', error);

      if (error && error.code !== 'PGRST116') throw error;

      if (data?.setting_value) {
        const settingValue = data.setting_value as any;
        console.log('Setting value type:', typeof settingValue, 'Content length:', settingValue.content?.length || 0);
        const prompts = Array.isArray(settingValue) ? 
          settingValue as unknown as SystemPromptVersion[] : 
          [settingValue as unknown as SystemPromptVersion];
        console.log('Processed prompts:', prompts.length, 'versions');
        setVersions(prompts);
        
        const latest = prompts[prompts.length - 1];
        console.log('Latest version content length:', latest?.content?.length || 0);
        setCurrentVersion(latest);
        setDraftContent(latest?.content || ULTAAI_SYSTEM_PROMPT);
        setDraftTargets(latest?.targets || ['router', 'chat']);
      } else {
        console.log('No data found, using fallback content');
        // Don't automatically create and save a version - just use the prompt in memory
        setDraftContent(ULTAAI_SYSTEM_PROMPT);
        setDraftTargets(['router', 'chat']);
        setVersions([]);
        setCurrentVersion(null);
      }
    } catch (error) {
      console.error('Error loading prompt versions:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load system prompt versions.',
        variant: 'destructive',
      });
    }
  };

  const loadAgents = async () => {
    try {
      console.log('Loading agents...');
      const { data, error } = await supabase
        .from('agents')
        .select('id, hostname')
        .order('hostname');

      console.log('Agents data:', data, 'error:', error);
      if (error) throw error;
      setAgents(data || []);
      if (data?.length > 0) {
        setPreviewAgent(data[0].id);
      }
    } catch (error) {
      console.error('Error loading agents:', error);
      setAgents([]); // Ensure agents is always an array
    }
  };

  const saveDraft = async () => {
    setLoading(true);
    try {
      const newVersion: SystemPromptVersion = {
        id: crypto.randomUUID(),
        content: draftContent,
        version: (versions.length || 0) + 1,
        published: false,
        created_at: new Date().toISOString(),
        author: user?.email || 'system',
        notes: draftNotes,
        targets: draftTargets
      };

      const updatedVersions = [...versions, newVersion];
      
      await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'ai.systemPrompt',
          setting_value: updatedVersions as any,
        }, {
          onConflict: 'setting_key'
        });

      setVersions(updatedVersions);
      setCurrentVersion(newVersion);
      setDraftNotes('');

      toast({
        title: 'Draft Saved',
        description: `Version ${newVersion.version} has been saved as draft.`,
      });
    } catch (error) {
      console.error('Error saving draft:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save prompt draft.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const publishVersion = async (versionId: string) => {
    setLoading(true);
    try {
      const updatedVersions = versions.map(v => ({
        ...v,
        published: v.id === versionId
      }));

      await supabase
        .from('system_settings')
        .upsert({
          setting_key: 'ai.systemPrompt',
          setting_value: updatedVersions as any,
        }, {
          onConflict: 'setting_key'
        });

      setVersions(updatedVersions);

      toast({
        title: 'Version Published',
        description: 'System prompt has been published and is now active.',
      });
    } catch (error) {
      console.error('Error publishing version:', error);
      toast({
        title: 'Publish Failed',
        description: 'Failed to publish prompt version.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const rollbackToVersion = async (versionId: string) => {
    const version = versions.find(v => v.id === versionId);
    if (!version) return;

    setDraftContent(version.content);
    setDraftTargets(version.targets);
    
    toast({
      title: 'Rolled Back',
      description: `Editor content set to version ${version.version}.`,
    });
  };


  const runDryRun = async () => {
    if (!previewAgent) return;
    
    setLoading(true);
    try {
      const agent = agents.find(a => a.id === previewAgent);
      const resolvedPrompt = draftContent
        .replace(/\{\{agent_name\}\}/g, agent?.hostname || 'Test Agent')
        .replace(/\{\{customer\}\}/g, 'Demo Customer')
        .replace(/\{\{plan\}\}/g, 'Professional')
        .replace(/\{\{date\}\}/g, new Date().toLocaleString())
        .replace(/\{\{locale\}\}/g, 'en-US');
      
      setRenderedPrompt(resolvedPrompt);
      
      // Rough token estimation (4 characters ≈ 1 token)
      const estimatedTokens = Math.ceil(resolvedPrompt.length / 4);
      setTokenEstimate(estimatedTokens);
      
      setDryRunDialog(true);
    } catch (error) {
      console.error('Error running dry run:', error);
      toast({
        title: 'Dry Run Failed',
        description: 'Failed to render prompt preview.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePreviewFullPrompt = async () => {
    if (!previewAgent) {
      toast({
        title: 'Agent Required',
        description: 'Please select an agent to preview the full prompt with real data.',
        variant: 'destructive'
      });
      return;
    }

    setIsLoadingFullPreview(true);
    try {
      // Call the router-payload function to get real data
      console.log('Calling router-payload with agent:', previewAgent);
      const { data: payloadData, error } = await supabase.functions.invoke('ultaai-router-payload', {
        body: { 
          agent_id: previewAgent, 
          user_request: sampleUserRequest 
        }
      });

      if (error) {
        console.error('Router payload error:', error);
        throw error;
      }

      console.log('Router payload response:', payloadData);

      // Transform payload to match router format
      const transformedPayload = {
        user_request: payloadData.user_request,
        heartbeat: payloadData.heartbeat,
        batches: payloadData.candidates || [], // Rename candidates to batches
        command_policies: payloadData.command_policies || [],
        policy_notes: payloadData.policy_notes || {}
      };

      // Generate the complete prompt that gets sent to OpenAI
      const systemMessage = currentVersion?.content || ULTAAI_SYSTEM_PROMPT;
      const userMessage = JSON.stringify(transformedPayload, null, 2);
      
      const fullPrompt = `=== SYSTEM MESSAGE ===
${systemMessage}

=== USER MESSAGE (JSON Payload) ===
${userMessage}

=== END OF PROMPT ===

This is exactly what gets sent to OpenAI:
- System Message: Your UltaAI prompt template
- User Message: Real agent data (heartbeat, available batches, policies, etc.)`;

      setFullPromptPreview(fullPrompt);
      setShowFullPromptDialog(true);

      toast({
        title: 'Full Prompt Generated',
        description: 'Showing complete prompt with real agent data',
      });

    } catch (error) {
      console.error('Error generating full prompt preview:', error);
      toast({
        title: 'Preview Failed',
        description: error.message || 'Failed to generate full prompt preview',
        variant: 'destructive'
      });
    } finally {
      setIsLoadingFullPreview(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            System Prompt Editor
          </CardTitle>
          <CardDescription>
            Create and manage system prompts with versioning and variable support.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">

          {/* System Prompt Editor with JSON Syntax Highlighting */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="prompt-content" className="text-base font-medium">
                System Prompt Content
              </Label>
              <div className="text-sm text-muted-foreground">
                {draftContent.length} characters • No limits
              </div>
            </div>
            <div className="border border-border rounded-lg overflow-hidden">
              <Editor
                height="750px"
                language="json"
                theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                value={draftContent}
                onChange={(value) => setDraftContent(value || '')}
                options={{
                  minimap: { enabled: false },
                  scrollBeyondLastLine: false,
                  wordWrap: 'on',
                  automaticLayout: true,
                  fontSize: 14,
                  lineNumbers: 'on',
                  folding: true,
                  bracketMatching: 'never',
                  autoIndent: 'none',
                  formatOnPaste: false,
                  formatOnType: false,
                  tabSize: 2,
                  insertSpaces: true,
                  renderWhitespace: 'none',
                  validate: false
                }}
              />
            </div>
          </div>

          {/* Target Selection */}
          <div>
            <Label className="text-base font-medium">Target Endpoints</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Select where this prompt should be applied.
            </p>
            <div className="flex flex-wrap gap-2">
              {PROMPT_TARGETS.map((target) => (
                <Button
                  key={target.value}
                  variant={draftTargets.includes(target.value) ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => {
                    if (draftTargets.includes(target.value)) {
                      setDraftTargets(prev => prev.filter(t => t !== target.value));
                    } else {
                      setDraftTargets(prev => [...prev, target.value]);
                    }
                  }}
                >
                  {target.label}
                </Button>
              ))}
            </div>
          </div>

          {/* Version Notes */}
          <div>
            <Label htmlFor="notes">Version Notes (Optional)</Label>
            <Input
              id="notes"
              value={draftNotes}
              onChange={(e) => setDraftNotes(e.target.value)}
              placeholder="Describe changes in this version..."
            />
          </div>

          {/* Actions */}
          <div className="flex gap-2">
            <Button onClick={saveDraft} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Draft
            </Button>
            
            <Button onClick={() => setDryRunDialog(true)} variant="outline" className="gap-2">
              <Eye className="h-4 w-4" />
              Preview Template
            </Button>
            <Button 
              onClick={handlePreviewFullPrompt} 
              disabled={!previewAgent || isLoadingFullPreview}
              variant="outline" 
              className="gap-2"
            >
              {isLoadingFullPreview ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Loading...
                </>
              ) : (
                <>
                  <Calculator className="h-4 w-4" />
                  Preview Full Prompt
                </>
              )}
            </Button>

            <Button 
              onClick={() => window.open('/chat/inbox?test=true', '_blank')} 
              variant="outline" 
              disabled={loading} 
              className="gap-2"
            >
              <MessageSquare className="h-4 w-4" />
              Test Live Chat
            </Button>

            {currentVersion && !currentVersion.published && (
              <Button 
                onClick={() => publishVersion(currentVersion.id)}
                variant="default"
                disabled={loading}
                className="gap-2"
              >
                <Upload className="h-4 w-4" />
                Publish
              </Button>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Version History */}
      <Card>
        <CardHeader>
          <CardTitle>Version History</CardTitle>
          <CardDescription>
            Manage and rollback to previous versions of your system prompt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {(versions || []).map((version) => {
              console.log('Rendering version:', version, 'targets:', version?.targets);
              return (
              <div key={version.id} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Version {version.version}</span>
                    {version.published && <Badge variant="default">Published</Badge>}
                    {version.notes && <span className="text-sm text-muted-foreground">- {version.notes}</span>}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    By {version.author} on {new Date(version.created_at).toLocaleString()}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Targets: {(version.targets || []).map(t => PROMPT_TARGETS.find(pt => pt.value === t)?.label).filter(Boolean).join(', ')}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => rollbackToVersion(version.id)}
                    className="gap-1"
                  >
                    <RotateCcw className="h-3 w-3" />
                    Rollback
                  </Button>
                  {!version.published && (
                    <Button
                      variant="default"
                      size="sm"
                      onClick={() => publishVersion(version.id)}
                      disabled={loading}
                      className="gap-1"
                    >
                      <Upload className="h-3 w-3" />
                      Publish
                    </Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

      {/* Dry Run Dialog */}
      <Dialog open={dryRunDialog} onOpenChange={setDryRunDialog}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Prompt Preview
            </DialogTitle>
            <DialogDescription>
              Preview of the resolved system prompt with variables filled.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Preview Agent</Label>
                <Select value={previewAgent} onValueChange={setPreviewAgent}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {(agents || []).map((agent) => (
                      <SelectItem key={agent.id} value={agent.id}>
                        {agent.hostname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Test Model</Label>
                <Select value={previewModel} onValueChange={setPreviewModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4o-mini">GPT-4o Mini</SelectItem>
                    <SelectItem value="gpt-4o">GPT-4o</SelectItem>
                    <SelectItem value="claude-3-5-sonnet">Claude 3.5 Sonnet</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label>Rendered Prompt</Label>
                <div className="flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  <span className="text-sm text-muted-foreground">~{tokenEstimate} tokens</span>
                </div>
              </div>
              <Textarea
                value={renderedPrompt}
                readOnly
                className="min-h-[200px] font-mono text-sm"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setDryRunDialog(false)}>
              Close
            </Button>
            <Button onClick={runDryRun} disabled={loading}>
              Refresh Preview
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Prompt Preview Dialog */}
      <Dialog open={showFullPromptDialog} onOpenChange={setShowFullPromptDialog}>
        <DialogContent className="max-w-6xl max-h-[80vh] overflow-hidden">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calculator className="h-5 w-5" />
              Complete Prompt Sent to OpenAI
            </DialogTitle>
            <DialogDescription>
              This shows the exact prompt structure sent to AI models: your system prompt template + real agent data payload.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4 max-h-[60vh] overflow-hidden">
            <div className="flex items-center gap-2">
              <Label htmlFor="sample-request">Sample User Request:</Label>
              <Input
                id="sample-request"
                value={sampleUserRequest}
                onChange={(e) => setSampleUserRequest(e.target.value)}
                placeholder="Enter a test user request..."
                className="flex-1"
              />
              <Button 
                onClick={handlePreviewFullPrompt} 
                disabled={isLoadingFullPreview}
                size="sm"
                className="gap-2"
              >
                {isLoadingFullPreview ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Loading...
                  </>
                ) : (
                  <>
                    <RotateCcw className="h-4 w-4" />
                    Refresh
                  </>
                )}
              </Button>
            </div>
            <div className="border rounded-lg overflow-hidden flex-1">
              <Textarea
                value={fullPromptPreview}
                readOnly
                className="w-full h-full min-h-[400px] font-mono text-sm resize-none border-0"
                placeholder="Full prompt with real agent data will appear here..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowFullPromptDialog(false)}>
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}