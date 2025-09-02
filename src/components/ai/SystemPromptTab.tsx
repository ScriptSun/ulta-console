import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { MessageSquare, Save, Loader2, FileText, Brain, Wrench, MessageCircle, Lightbulb, Command, RefreshCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

interface PromptType {
  key: string;
  name: string;
  description: string;
  usedBy: string[];
  icon: React.ComponentType<{ className?: string }>;
  content: string;
}

const PROMPT_TYPES: PromptType[] = [
  {
    key: 'router',
    name: 'Router System Prompt',
    description: 'Main decision-making prompt that routes user requests to appropriate actions or chat responses.',
    usedBy: ['ultaai-router-decide', 'ws-router'],
    icon: Brain,
    content: ''
  },
  {
    key: 'chat',
    name: 'Chat System Prompt',
    description: 'Friendly conversational prompt for general chat interactions and user support.',
    usedBy: ['chat-api', 'chat-router'],
    icon: MessageCircle,
    content: ''
  },
  {
    key: 'tools',
    name: 'Tools System Prompt',
    description: 'Technical prompt for executing server management tasks and handling tool operations.',
    usedBy: ['ultaai-exec-run', 'ws-exec'],
    icon: Wrench,
    content: ''
  },
  {
    key: 'advice',
    name: 'Advice System Prompt',
    description: 'Analytical prompt for generating system insights and performance recommendations.',
    usedBy: ['ultaai-advice'],
    icon: Lightbulb,
    content: ''
  },
  {
    key: 'input-filler',
    name: 'Input Filler System Prompt',
    description: 'Specialized prompt for automatically filling batch input parameters from user requests.',
    usedBy: ['ultaai-inputs-fill'],
    icon: FileText,
    content: ''
  },
  {
    key: 'command-suggestion',
    name: 'Command Suggestion System Prompt',
    description: 'Safety-focused prompt for analyzing and suggesting appropriate server commands.',
    usedBy: ['ultaai-command-suggest'],
    icon: Command,
    content: ''
  }
];

export function SystemPromptTab() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [prompts, setPrompts] = useState<PromptType[]>(PROMPT_TYPES);
  const [activeTab, setActiveTab] = useState('router');
  const [savingPrompt, setSavingPrompt] = useState('');

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      // Load all prompt files
      const loadPromises = PROMPT_TYPES.map(async (promptType) => {
        try {
          const { data, error } = await supabase.functions.invoke('get-system-prompt', {
            body: { target: promptType.key }
          });
          
          if (error) throw error;
          
          return {
            ...promptType,
            content: data.prompt || `# ${promptType.name}\n\nPrompt content not yet defined.`
          };
        } catch (error) {
          console.error(`Error loading ${promptType.key} prompt:`, error);
          return {
            ...promptType,
            content: `# ${promptType.name}\n\nError loading prompt: ${error.message || 'Unknown error'}`
          };
        }
      });

      const loadedPrompts = await Promise.all(loadPromises);
      setPrompts(loadedPrompts);
      
      toast({
        title: 'Prompts Loaded',
        description: 'System prompts loaded from files.',
      });
    } catch (error) {
      console.error('Error loading prompts:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load system prompts.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (promptKey: string, content: string) => {
    setSavingPrompt(promptKey);
    try {
      // Create edge function to save prompt file
      const { error } = await supabase.functions.invoke('save-system-prompt', {
        body: { 
          target: promptKey,
          content: content
        }
      });
      
      if (error) throw error;
      
      // Update local state
      setPrompts(prev => prev.map(p => 
        p.key === promptKey ? { ...p, content } : p
      ));
      
      toast({
        title: 'Prompt Saved',
        description: `${prompts.find(p => p.key === promptKey)?.name} has been saved to file.`,
      });
    } catch (error) {
      console.error('Error saving prompt:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save prompt file.',
        variant: 'destructive',
      });
    } finally {
      setSavingPrompt('');
    }
  };

  const updatePromptContent = (promptKey: string, content: string) => {
    setPrompts(prev => prev.map(p => 
      p.key === promptKey ? { ...p, content } : p
    ));
  };

  const getCurrentPrompt = () => {
    return prompts.find(p => p.key === activeTab) || prompts[0];
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MessageSquare className="h-5 w-5" />
            File-Based System Prompts
          </CardTitle>
          <CardDescription>
            Manage system prompts stored as markdown files. Each prompt serves a specific purpose in the AI pipeline.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-6">
              {prompts.map((prompt) => {
                const Icon = prompt.icon;
                return (
                  <TabsTrigger key={prompt.key} value={prompt.key} className="flex items-center gap-2">
                    <Icon className="h-4 w-4" />
                    <span className="hidden sm:inline">{prompt.name.split(' ')[0]}</span>
                  </TabsTrigger>
                );
              })}
            </TabsList>

            {prompts.map((prompt) => (
              <TabsContent key={prompt.key} value={prompt.key} className="mt-6">
                <div className="space-y-4">
                  {/* Prompt Info */}
                  <div className="space-y-2">
                    <h3 className="text-lg font-semibold flex items-center gap-2">
                      <prompt.icon className="h-5 w-5" />
                      {prompt.name}
                    </h3>
                    <p className="text-sm text-muted-foreground">{prompt.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {prompt.usedBy.map((func) => (
                        <Badge key={func} variant="secondary" className="text-xs">
                          {func}
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Editor */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <label className="text-sm font-medium">Prompt Content</label>
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-muted-foreground">
                          {prompt.content.length} characters
                        </span>
                        <Button 
                          size="sm"
                          variant="outline"
                          onClick={loadPrompts}
                          disabled={loading}
                          className="gap-1"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Reload
                        </Button>
                      </div>
                    </div>
                    <div className="border border-border rounded-lg overflow-hidden">
                      <Editor
                        height="400px"
                        language="markdown"
                        theme={theme === 'dark' ? 'vs-dark' : 'vs'}
                        value={prompt.content}
                        onChange={(value) => updatePromptContent(prompt.key, value || '')}
                        options={{
                          minimap: { enabled: false },
                          scrollBeyondLastLine: false,
                          wordWrap: 'on',
                          automaticLayout: true,
                          fontSize: 14,
                          lineNumbers: 'on',
                          folding: true,
                          tabSize: 2,
                          insertSpaces: true
                        }}
                      />
                    </div>
                  </div>

                  {/* Save Button */}
                  <div className="flex justify-end">
                    <Button 
                      onClick={() => savePrompt(prompt.key, prompt.content)}
                      disabled={savingPrompt === prompt.key}
                      className="gap-2"
                    >
                      {savingPrompt === prompt.key ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Save className="h-4 w-4" />
                      )}
                      Save to File
                    </Button>
                  </div>
                </div>
              </TabsContent>
            ))}
          </Tabs>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>• <strong>File-based storage:</strong> Prompts are stored as .md files in <code>supabase/functions/_shared/prompts/</code></p>
            <p>• <strong>No versioning:</strong> Use Git for version control and history</p>
            <p>• <strong>Immediate effect:</strong> Changes take effect immediately in edge functions</p>
            <p>• <strong>Specialized prompts:</strong> Each prompt is optimized for its specific use case</p>
            <p>• <strong>Cache-enabled:</strong> Prompts are cached for 5 minutes for better performance</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}