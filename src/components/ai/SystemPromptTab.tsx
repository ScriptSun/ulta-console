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
  Search,
  Replace,
  Calculator,
  Play
} from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
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

const AVAILABLE_VARIABLES = [
  { key: '{{agent_name}}', description: 'Name of the current agent' },
  { key: '{{customer}}', description: 'Customer or tenant name' },
  { key: '{{plan}}', description: 'Current subscription plan' },
  { key: '{{date}}', description: 'Current date and time' },
  { key: '{{locale}}', description: 'User locale/language' },
];

const PROMPT_TARGETS = [
  { value: 'chat', label: 'Chat Conversations' },
  { value: 'router', label: 'Command Router' },
  { value: 'tools', label: 'Tool Execution' },
  { value: 'custom', label: 'Custom Endpoints' },
];

export function SystemPromptTab() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [versions, setVersions] = useState<SystemPromptVersion[]>([]);
  const [currentVersion, setCurrentVersion] = useState<SystemPromptVersion | null>(null);
  const [draftContent, setDraftContent] = useState('');
  const [draftNotes, setDraftNotes] = useState('');
  const [draftTargets, setDraftTargets] = useState<string[]>(['chat']);
  const [publishedVersion, setPublishedVersion] = useState<SystemPromptVersion | null>(null);
  const [previewAgent, setPreviewAgent] = useState<string>('');
  const [previewModel, setPreviewModel] = useState<string>('gpt-4o-mini');
  const [agents, setAgents] = useState<any[]>([]);
  const [searchText, setSearchText] = useState('');
  const [replaceText, setReplaceText] = useState('');
  const [dryRunDialog, setDryRunDialog] = useState(false);
  const [renderedPrompt, setRenderedPrompt] = useState('');
  const [tokenEstimate, setTokenEstimate] = useState(0);

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
        console.log('Setting value type:', typeof data.setting_value, data.setting_value);
        const prompts = Array.isArray(data.setting_value) ? 
          data.setting_value as unknown as SystemPromptVersion[] : 
          [data.setting_value as unknown as SystemPromptVersion];
        console.log('Processed prompts:', prompts);
        setVersions(prompts);
        
        const published = prompts.find(p => p.published);
        setPublishedVersion(published || null);
        
        const latest = prompts[prompts.length - 1];
        console.log('Latest version:', latest);
        setCurrentVersion(latest);
        setDraftContent(latest?.content || 'You are a helpful AI assistant.');
        setDraftTargets(latest?.targets || ['chat']);
      } else {
        console.log('No data found, creating initial version');
        // Create initial version
        const initialPrompt: SystemPromptVersion = {
          id: crypto.randomUUID(),
          content: 'You are a helpful AI assistant.',
          version: 1,
          published: true,
          created_at: new Date().toISOString(),
          author: user?.email || 'system',
          targets: ['chat']
        };
        
        setVersions([initialPrompt]);
        setPublishedVersion(initialPrompt);
        setCurrentVersion(initialPrompt);
        setDraftContent(initialPrompt.content);
        setDraftTargets(initialPrompt.targets);
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
      setPublishedVersion(updatedVersions.find(v => v.id === versionId) || null);

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

  const handleFindReplace = () => {
    if (!searchText) return;
    
    const newContent = draftContent.replace(new RegExp(searchText, 'g'), replaceText);
    setDraftContent(newContent);
    setSearchText('');
    setReplaceText('');
    
    toast({
      title: 'Text Replaced',
      description: 'Find and replace operation completed.',
    });
  };

  const insertVariable = (variable: string) => {
    const textarea = document.querySelector('textarea[data-prompt-editor="true"]') as HTMLTextAreaElement;
    if (textarea) {
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const newContent = draftContent.substring(0, start) + variable + draftContent.substring(end);
      setDraftContent(newContent);
      
      // Restore cursor position
      setTimeout(() => {
        textarea.selectionStart = textarea.selectionEnd = start + variable.length;
        textarea.focus();
      }, 0);
    } else {
      setDraftContent(prev => prev + variable);
    }
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
          {/* Current Published Version Info */}
          {publishedVersion && (
            <div className="p-4 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <p className="font-medium text-green-800 dark:text-green-200">
                    Active Version {publishedVersion.version}
                  </p>
                  <p className="text-sm text-green-600 dark:text-green-400">
                    Published by {publishedVersion.author} on {new Date(publishedVersion.created_at).toLocaleDateString()}
                  </p>
                </div>
                <Badge variant="default" className="bg-green-600">Published</Badge>
              </div>
            </div>
          )}

          {/* Find and Replace */}
          <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
            <div>
              <Label htmlFor="search">Find</Label>
              <Input
                id="search"
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search text..."
              />
            </div>
            <div>
              <Label htmlFor="replace">Replace</Label>
              <Input
                id="replace"
                value={replaceText}
                onChange={(e) => setReplaceText(e.target.value)}
                placeholder="Replacement text..."
              />
            </div>
            <div className="flex items-end">
              <Button 
                onClick={handleFindReplace}
                disabled={!searchText}
                className="gap-2"
              >
                <Replace className="h-4 w-4" />
                Replace All
              </Button>
            </div>
          </div>

          {/* Variables */}
          <div>
            <Label className="text-base font-medium">Available Variables</Label>
            <p className="text-sm text-muted-foreground mb-2">
              Click to insert variables that will be replaced at runtime.
            </p>
            <div className="flex flex-wrap gap-2">
              {AVAILABLE_VARIABLES.map((variable) => (
                <Button
                  key={variable.key}
                  variant="outline"
                  size="sm"
                  onClick={() => insertVariable(variable.key)}
                  title={variable.description}
                >
                  {variable.key}
                </Button>
              ))}
            </div>
          </div>

          {/* Prompt Editor */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <Label htmlFor="prompt-content" className="text-base font-medium">
                System Prompt Content
              </Label>
              <div className="text-sm text-muted-foreground">
                {draftContent.length} characters
              </div>
            </div>
            <Textarea
              id="prompt-content"
              data-prompt-editor="true"
              value={draftContent}
              onChange={(e) => setDraftContent(e.target.value)}
              placeholder="Enter your system prompt here..."
              className="min-h-[300px] font-mono text-sm"
            />
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
            
            <Button onClick={runDryRun} variant="outline" disabled={loading} className="gap-2">
              <Play className="h-4 w-4" />
              Dry Run
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
    </div>
  );
}