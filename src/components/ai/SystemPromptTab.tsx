import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Save, Loader2, Brain, RefreshCw } from 'lucide-react';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';
import { loadAllPromptsFromDB, savePromptToDB } from '@/lib/systemPromptsService';

interface PromptType {
  key: string;
  name: string;
  description: string;
  usedBy: string[];
  icon: React.ComponentType<{ className?: string }>;
  content: string;
}

const DEFAULT_ROUTER_PROMPT: PromptType = {
  key: 'router',
  name: 'Router System Prompt',
  description: 'Main decision-making prompt that routes user requests to appropriate actions or chat responses.',
  usedBy: ['ultaai-router-decide', 'ws-router'],
  icon: Brain,
  content: ''
};

export function SystemPromptTab() {
  const { toast } = useToast();
  const { theme } = useTheme();
  const [loading, setLoading] = useState(false);
  const [routerPrompt, setRouterPrompt] = useState<PromptType>(DEFAULT_ROUTER_PROMPT);
  const [savingPrompt, setSavingPrompt] = useState(false);

  useEffect(() => {
    loadPrompts();
  }, []);

  const loadPrompts = async () => {
    setLoading(true);
    try {
      console.log('🔄 Loading router system prompt from database...');
      
      const dbPrompts = await loadAllPromptsFromDB();
      
      // Find router prompt in database
      const dbRouterPrompt = dbPrompts.find(p => p.prompt_key === 'router');
      const updatedRouterPrompt = {
        ...DEFAULT_ROUTER_PROMPT,
        content: dbRouterPrompt?.content || `# ${DEFAULT_ROUTER_PROMPT.name}\n\nPrompt content not yet defined.`
      };

      setRouterPrompt(updatedRouterPrompt);
      console.log('✅ Router prompt loaded successfully from database');
      
      toast({
        title: 'Router Prompt Loaded',
        description: 'Router system prompt loaded from database.',
      });
    } catch (error: any) {
      console.error('❌ Failed to load router prompt:', error);
      toast({
        title: 'Loading Failed',
        description: `Failed to load router prompt: ${error.message}`,
        variant: 'destructive',
      });
      // Fall back to default prompt
      setRouterPrompt(DEFAULT_ROUTER_PROMPT);
    } finally {
      setLoading(false);
    }
  };

  const savePrompt = async (content: string) => {
    setSavingPrompt(true);
    try {
      console.log(`💾 Saving router prompt to database...`);
      
      await savePromptToDB('router', content.trim());
      
      // Update local state
      setRouterPrompt(prev => ({ ...prev, content }));
      
      console.log(`✅ Successfully saved router prompt to database`);
      toast({
        title: 'Router Prompt Saved',
        description: 'Router system prompt has been saved to database.',
      });
    } catch (error: any) {
      console.error(`❌ Error saving router prompt:`, error);
      toast({
        title: 'Save Failed',
        description: `Failed to save prompt: ${error.message}`,
        variant: 'destructive',
      });
    } finally {
      setSavingPrompt(false);
    }
  };

  const updatePromptContent = (content: string) => {
    setRouterPrompt(prev => ({ ...prev, content }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Router System Prompt
          </CardTitle>
          <CardDescription>
            Main decision-making prompt that routes user requests to appropriate actions or chat responses.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Editor */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium">Prompt Content</label>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-muted-foreground">
                    {routerPrompt.content.length} characters
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
                  value={routerPrompt.content}
                  onChange={(value) => updatePromptContent(value || '')}
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
                onClick={() => savePrompt(routerPrompt.content)}
                disabled={savingPrompt}
                className="gap-2"
              >
                {savingPrompt ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Save className="h-4 w-4" />
                )}
                Save to Database
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Info Card */}
      <Card>
        <CardHeader>
          <CardTitle>How It Works</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>• <strong>Database storage:</strong> Router prompt is stored in the `system_prompts` table with Base64 encoding</p>
            <p>• <strong>No encoding issues:</strong> Base64 encoding handles HTML entities and Unicode characters</p>
            <p>• <strong>Immediate effect:</strong> Changes take effect immediately across all router services</p>
            <p>• <strong>Decision making:</strong> This prompt controls how user requests are routed and processed</p>
            <p>• <strong>Version tracking:</strong> Database tracks creation and update timestamps</p>
            <p>• <strong>Reliable:</strong> No file system dependencies or edge function issues</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}