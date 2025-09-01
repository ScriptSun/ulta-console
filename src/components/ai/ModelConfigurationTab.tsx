import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Settings, Save, Loader2, Eye, Bot } from 'lucide-react';

interface GlobalConfig {
  temperature: number;
  top_p: number;
  max_tokens: number;
  response_format: 'text' | 'json';
  tool_use_allowed: boolean;
  safety_level: 'low' | 'medium' | 'high';
  retry_count: number;
  timeout_seconds: number;
  streaming: boolean;
}

interface AgentOverride extends GlobalConfig {
  agent_id: string;
  agent_name: string;
}

export function ModelConfigurationTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [selectedScope, setSelectedScope] = useState<'global' | 'agents'>('global');
  const [selectedAgents, setSelectedAgents] = useState<string[]>([]);
  const [previewAgent, setPreviewAgent] = useState<string>('');
  const [agents, setAgents] = useState<any[]>([]);
  
  const [globalConfig, setGlobalConfig] = useState<GlobalConfig>({
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 4000,
    response_format: 'text',
    tool_use_allowed: true,
    safety_level: 'medium',
    retry_count: 3,
    timeout_seconds: 30,
    streaming: true,
  });

  const [agentOverrides, setAgentOverrides] = useState<Record<string, AgentOverride>>({});

  useEffect(() => {
    loadConfiguration();
    loadAgents();
  }, []);

  const loadConfiguration = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['ai.defaults.global', 'ai.defaults.agents']);

      if (error) throw error;

      const globalData = data?.find(s => s.setting_key === 'ai.defaults.global')?.setting_value as Partial<GlobalConfig> | undefined;
      const agentsData = data?.find(s => s.setting_key === 'ai.defaults.agents')?.setting_value as unknown as Record<string, AgentOverride> | undefined;

      if (globalData) {
        setGlobalConfig(prev => ({ ...prev, ...globalData }));
      }

      if (agentsData) {
        setAgentOverrides(agentsData);
      }
    } catch (error) {
      console.error('Error loading configuration:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load model configuration.',
        variant: 'destructive',
      });
    }
  };

  const loadAgents = async () => {
    try {
      const { data, error } = await supabase
        .from('agents')
        .select('id, hostname')
        .order('hostname');

      if (error) throw error;
      setAgents(data || []);
    } catch (error) {
      console.error('Error loading agents:', error);
    }
  };

  const saveConfiguration = async () => {
    setLoading(true);
    try {
      const updates = [
        {
          setting_key: 'ai.defaults.global',
          setting_value: globalConfig,
        },
        {
          setting_key: 'ai.defaults.agents',
          setting_value: agentOverrides,
        }
      ];

      await supabase
        .from('system_settings')
        .upsert(updates as any, { onConflict: 'setting_key' });

      toast({
        title: 'Configuration Saved',
        description: 'Model configuration has been updated.',
      });
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save model configuration.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateGlobalConfig = (field: keyof GlobalConfig, value: any) => {
    setGlobalConfig(prev => ({ ...prev, [field]: value }));
  };

  const updateAgentOverride = (agentId: string, field: keyof GlobalConfig, value: any) => {
    const agent = agents.find(a => a.id === agentId);
    setAgentOverrides(prev => ({
      ...prev,
      [agentId]: {
        ...globalConfig,
        ...prev[agentId],
        agent_id: agentId,
        agent_name: agent?.hostname || agentId,
        [field]: value
      }
    }));
  };

  const getResolvedConfig = (agentId?: string): GlobalConfig => {
    if (agentId && agentOverrides[agentId]) {
      return { ...globalConfig, ...agentOverrides[agentId] };
    }
    return globalConfig;
  };

  const currentConfig = selectedScope === 'global' ? globalConfig : 
    selectedAgents.length === 1 ? (agentOverrides[selectedAgents[0]] || globalConfig) : globalConfig;

  const updateCurrentConfig = (field: keyof GlobalConfig, value: any) => {
    if (selectedScope === 'global') {
      updateGlobalConfig(field, value);
    } else if (selectedAgents.length === 1) {
      updateAgentOverride(selectedAgents[0], field, value);
    } else {
      // Apply to all selected agents
      selectedAgents.forEach(agentId => {
        updateAgentOverride(agentId, field, value);
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            Model Configuration
          </CardTitle>
          <CardDescription>
            Configure global AI parameters and per-agent overrides.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Scope Selector */}
          <div className="space-y-4">
            <Label className="text-base font-medium">Configuration Scope</Label>
            <div className="flex gap-4">
              <Button
                variant={selectedScope === 'global' ? 'default' : 'outline'}
                onClick={() => setSelectedScope('global')}
                className="gap-2"
              >
                <Settings className="h-4 w-4" />
                Global Defaults
              </Button>
              <Button
                variant={selectedScope === 'agents' ? 'default' : 'outline'}
                onClick={() => setSelectedScope('agents')}
                className="gap-2"
              >
                <Bot className="h-4 w-4" />
                Agent Overrides
              </Button>
            </div>
          </div>

          {/* Agent Selection (when agents scope is selected) */}
          {selectedScope === 'agents' && (
            <div>
              <Label className="text-base font-medium">Select Agents</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Choose agents to configure with custom parameters.
              </p>
              <Select value={selectedAgents[0] || ''} onValueChange={(value) => setSelectedAgents([value])}>
                <SelectTrigger>
                  <SelectValue placeholder="Select an agent" />
                </SelectTrigger>
                <SelectContent>
                  {agents.map((agent) => (
                    <SelectItem key={agent.id} value={agent.id}>
                      {agent.hostname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          {/* Configuration Parameters */}
          <div className="grid md:grid-cols-2 gap-6">
            {/* Temperature */}
            <div>
              <Label>Temperature: {currentConfig.temperature}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Controls randomness (0 = deterministic, 1 = creative)
              </p>
              <Slider
                value={[currentConfig.temperature]}
                onValueChange={([value]) => updateCurrentConfig('temperature', value)}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Top P */}
            <div>
              <Label>Top P: {currentConfig.top_p}</Label>
              <p className="text-sm text-muted-foreground mb-2">
                Nucleus sampling threshold
              </p>
              <Slider
                value={[currentConfig.top_p]}
                onValueChange={([value]) => updateCurrentConfig('top_p', value)}
                max={1}
                min={0}
                step={0.1}
                className="w-full"
              />
            </div>

            {/* Max Tokens */}
            <div>
              <Label htmlFor="max_tokens">Max Tokens</Label>
              <Input
                id="max_tokens"
                type="number"
                value={currentConfig.max_tokens}
                onChange={(e) => updateCurrentConfig('max_tokens', parseInt(e.target.value) || 4000)}
              />
            </div>

            {/* Response Format */}
            <div>
              <Label>Response Format</Label>
              <Select 
                value={currentConfig.response_format} 
                onValueChange={(value: 'text' | 'json') => updateCurrentConfig('response_format', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="text">Text</SelectItem>
                  <SelectItem value="json">JSON</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Safety Level */}
            <div>
              <Label>Safety Level</Label>
              <Select 
                value={currentConfig.safety_level} 
                onValueChange={(value: 'low' | 'medium' | 'high') => updateCurrentConfig('safety_level', value)}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Retry Count */}
            <div>
              <Label htmlFor="retry_count">Retry Count</Label>
              <Input
                id="retry_count"
                type="number"
                value={currentConfig.retry_count}
                onChange={(e) => updateCurrentConfig('retry_count', parseInt(e.target.value) || 3)}
                min="0"
                max="10"
              />
            </div>

            {/* Timeout */}
            <div>
              <Label htmlFor="timeout">Timeout (seconds)</Label>
              <Input
                id="timeout"
                type="number"
                value={currentConfig.timeout_seconds}
                onChange={(e) => updateCurrentConfig('timeout_seconds', parseInt(e.target.value) || 30)}
              />
            </div>
          </div>

          {/* Boolean Settings */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Tool Use Allowed</p>
                <p className="text-sm text-muted-foreground">
                  Allow AI to use available tools and functions
                </p>
              </div>
              <Switch
                checked={currentConfig.tool_use_allowed}
                onCheckedChange={(checked) => updateCurrentConfig('tool_use_allowed', checked)}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div>
                <p className="font-medium">Streaming Responses</p>
                <p className="text-sm text-muted-foreground">
                  Stream responses in real-time
                </p>
              </div>
              <Switch
                checked={currentConfig.streaming}
                onCheckedChange={(checked) => updateCurrentConfig('streaming', checked)}
              />
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveConfiguration} disabled={loading} className="gap-2">
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Save className="h-4 w-4" />
              )}
              Save Configuration
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Preview Panel */}
      {selectedScope === 'agents' && selectedAgents.length === 1 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5" />
              Configuration Preview
            </CardTitle>
            <CardDescription>
              Resolved configuration for the selected agent.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid md:grid-cols-2 gap-4 text-sm">
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Temperature:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).temperature}</span>
                </div>
                <div className="flex justify-between">
                  <span>Top P:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).top_p}</span>
                </div>
                <div className="flex justify-between">
                  <span>Max Tokens:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).max_tokens}</span>
                </div>
                <div className="flex justify-between">
                  <span>Response Format:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).response_format}</span>
                </div>
              </div>
              <div className="space-y-2">
                <div className="flex justify-between">
                  <span>Safety Level:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).safety_level}</span>
                </div>
                <div className="flex justify-between">
                  <span>Retry Count:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).retry_count}</span>
                </div>
                <div className="flex justify-between">
                  <span>Timeout:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).timeout_seconds}s</span>
                </div>
                <div className="flex justify-between">
                  <span>Tools Allowed:</span>
                  <span className="font-mono">{getResolvedConfig(selectedAgents[0]).tool_use_allowed ? 'Yes' : 'No'}</span>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}