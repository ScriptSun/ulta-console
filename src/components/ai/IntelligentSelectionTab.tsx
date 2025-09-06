import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { api } from '@/lib/api-wrapper';
import { 
  Zap, 
  Save, 
  Loader2, 
  Plus,
  Trash2,
  TestTube,
  Clock,
  DollarSign,
  AlertTriangle,
  Brain
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface PatternRule {
  id: string;
  name: string;
  pattern: string;
  patternType: 'regex' | 'keyword' | 'contains';
  modelType: 'fast' | 'smart';
  priority: number;
  enabled: boolean;
  description: string;
}

interface ModelMapping {
  fast: string[];
  smart: string[];
}

interface IntelligentSelectionSettings {
  enabled: boolean;
  rules: PatternRule[];
  modelMapping: ModelMapping;
  defaultModel: 'fast' | 'smart';
  fallbackEnabled: boolean;
}

const DEFAULT_RULES: PatternRule[] = [
  {
    id: 'greetings',
    name: 'Greetings',
    pattern: '^(hi|hey|hello|good morning|good afternoon|good evening)',
    patternType: 'regex',
    modelType: 'fast',
    priority: 1,
    enabled: true,
    description: 'Simple greetings and conversation starters'
  },
  {
    id: 'simple-commands',
    name: 'Simple System Commands',
    pattern: '^(check|show|list|get)\\s+(disk|memory|cpu|processes|status|uptime)',
    patternType: 'regex',
    modelType: 'fast',
    priority: 2,
    enabled: true,
    description: 'Basic system information commands'
  },
  {
    id: 'predefined-installs',
    name: 'Predefined Software Installation',
    pattern: '^install\\s+(wordpress|docker|nodejs|nginx|mysql|apache|php)',
    patternType: 'regex',
    modelType: 'fast',
    priority: 3,
    enabled: true,
    description: 'Common software installations with existing batch scripts'
  },
  {
    id: 'custom-scripts',
    name: 'Custom Script Generation',
    pattern: '(create|generate|write|build)\\s+(script|automation|workflow)',
    patternType: 'regex',
    modelType: 'smart',
    priority: 4,
    enabled: true,
    description: 'Custom script and automation generation'
  },
  {
    id: 'complex-configs',
    name: 'Complex Configuration',
    pattern: '(configure|setup|customize)\\s+.*(security|ssl|firewall|network|database)',
    patternType: 'regex',
    modelType: 'smart',
    priority: 5,
    enabled: true,
    description: 'Complex system configurations requiring detailed analysis'
  }
];

const DEFAULT_MODEL_MAPPING: ModelMapping = {
  fast: ['gpt-5-nano-2025-08-07', 'gpt-5-mini-2025-08-07', 'claude-3-5-haiku-20241022'],
  smart: ['gpt-5-2025-08-07', 'claude-opus-4-20250514', 'claude-sonnet-4-20250514']
};

export function IntelligentSelectionTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [settings, setSettings] = useState<IntelligentSelectionSettings>({
    enabled: true,
    rules: DEFAULT_RULES,
    modelMapping: DEFAULT_MODEL_MAPPING,
    defaultModel: 'fast',
    fallbackEnabled: true
  });
  const [newRuleDialog, setNewRuleDialog] = useState(false);
  const [testQuery, setTestQuery] = useState('');
  const [testResult, setTestResult] = useState<{ modelType: 'fast' | 'smart'; rule?: PatternRule; models: string[] } | null>(null);
  const [newRule, setNewRule] = useState({
    name: '',
    pattern: '',
    patternType: 'regex' as const,
    modelType: 'fast' as const,
    description: ''
  });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const response = await api.selectOne('system_settings', '*', {
        setting_key: 'ai.intelligent_selection'
      });

      if (response.success && response.data) {
        const data = response.data;

        if (data.setting_value) {
          const settingValue = data.setting_value as any;
          setSettings({
            ...settings,
            ...settingValue
          });
        }
      }
    } catch (error) {
      console.error('Error loading intelligent selection settings:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load intelligent selection settings.',
        variant: 'destructive',
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      const response = await api.upsert('system_settings', {
        setting_key: 'ai.intelligent_selection',
        setting_value: settings as any,
      });

      if (!response.success) throw new Error(response.error);

      toast({
        title: 'Settings Saved',
        description: 'Intelligent selection configuration has been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save intelligent selection settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const testModelSelection = () => {
    if (!testQuery.trim()) return;

    setTesting(true);
    try {
      // Sort rules by priority
      const sortedRules = [...settings.rules]
        .filter(rule => rule.enabled)
        .sort((a, b) => a.priority - b.priority);

      let matchedRule: PatternRule | undefined;
      
      for (const rule of sortedRules) {
        let matches = false;
        
        switch (rule.patternType) {
          case 'regex':
            try {
              const regex = new RegExp(rule.pattern, 'i');
              matches = regex.test(testQuery);
            } catch (e) {
              console.warn(`Invalid regex pattern in rule ${rule.name}:`, e);
            }
            break;
          case 'keyword':
            matches = testQuery.toLowerCase().includes(rule.pattern.toLowerCase());
            break;
          case 'contains':
            matches = testQuery.toLowerCase().includes(rule.pattern.toLowerCase());
            break;
        }

        if (matches) {
          matchedRule = rule;
          break;
        }
      }

      const modelType = matchedRule?.modelType || settings.defaultModel;
      const models = settings.modelMapping[modelType];

      setTestResult({
        modelType,
        rule: matchedRule,
        models
      });
    } finally {
      setTesting(false);
    }
  };

  const addRule = () => {
    const rule: PatternRule = {
      id: `rule_${Date.now()}`,
      ...newRule,
      priority: settings.rules.length + 1,
      enabled: true
    };

    setSettings(prev => ({
      ...prev,
      rules: [...prev.rules, rule]
    }));

    setNewRule({
      name: '',
      pattern: '',
      patternType: 'regex',
      modelType: 'fast',
      description: ''
    });
    setNewRuleDialog(false);

    toast({
      title: 'Rule Added',
      description: 'New pattern rule has been added.',
    });
  };

  const removeRule = (ruleId: string) => {
    setSettings(prev => ({
      ...prev,
      rules: prev.rules.filter(rule => rule.id !== ruleId)
    }));
  };

  const updateRule = (ruleId: string, updates: Partial<PatternRule>) => {
    setSettings(prev => ({
      ...prev,
      rules: prev.rules.map(rule => 
        rule.id === ruleId ? { ...rule, ...updates } : rule
      )
    }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Intelligent Model Selection
          </CardTitle>
          <CardDescription>
            Automatically choose fast or smart models based on request complexity to optimize cost and performance.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Enable/Disable Toggle */}
          <div className="flex items-center justify-between p-4 border rounded-lg">
            <div>
              <h3 className="font-medium">Enable Intelligent Selection</h3>
              <p className="text-sm text-muted-foreground">
                Automatically route requests to appropriate models based on complexity
              </p>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={(checked) => setSettings(prev => ({ ...prev, enabled: checked }))}
            />
          </div>

          {/* Model Mapping */}
          <div className="space-y-4">
            <h3 className="font-medium">Model Categories</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  Fast Models (3x faster, 10x cheaper)
                </Label>
                <div className="text-sm text-muted-foreground mb-2">
                  For greetings, simple commands, predefined tasks
                </div>
                <div className="space-y-1">
                  {settings.modelMapping.fast.map((model, index) => (
                    <Badge key={index} variant="secondary" className="mr-1">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Brain className="h-4 w-4" />
                  Smart Models (Advanced reasoning)
                </Label>
                <div className="text-sm text-muted-foreground mb-2">
                  For custom scripts, complex configurations, novel requests
                </div>
                <div className="space-y-1">
                  {settings.modelMapping.smart.map((model, index) => (
                    <Badge key={index} variant="default" className="mr-1">
                      {model}
                    </Badge>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Test Query */}
          <div className="space-y-4 p-4 border rounded-lg bg-muted/50">
            <h3 className="font-medium">Test Model Selection</h3>
            <div className="flex gap-2">
              <Input
                placeholder="Enter a test query (e.g., 'check disk space', 'create custom backup script')"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && testModelSelection()}
              />
              <Button onClick={testModelSelection} disabled={testing || !testQuery.trim()}>
                {testing ? <Loader2 className="h-4 w-4 animate-spin" /> : <TestTube className="h-4 w-4" />}
                Test
              </Button>
            </div>
            {testResult && (
              <div className="mt-4 p-3 border rounded-lg bg-background">
                <div className="flex items-center gap-2 mb-2">
                  <Badge variant={testResult.modelType === 'fast' ? 'secondary' : 'default'}>
                    {testResult.modelType === 'fast' ? 'Fast Model' : 'Smart Model'}
                  </Badge>
                  {testResult.rule && (
                    <span className="text-sm text-muted-foreground">
                      Matched rule: {testResult.rule.name}
                    </span>
                  )}
                </div>
                <div className="text-sm">
                  Selected models: {testResult.models.join(', ')}
                </div>
              </div>
            )}
          </div>

          {/* Pattern Rules */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Pattern Rules</h3>
              <Dialog open={newRuleDialog} onOpenChange={setNewRuleDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Rule
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Add Pattern Rule</DialogTitle>
                    <DialogDescription>
                      Create a new rule to automatically select models based on request patterns.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="rule-name">Rule Name</Label>
                        <Input
                          id="rule-name"
                          value={newRule.name}
                          onChange={(e) => setNewRule(prev => ({ ...prev, name: e.target.value }))}
                          placeholder="E.g., Database Commands"
                        />
                      </div>
                      <div>
                        <Label htmlFor="rule-type">Pattern Type</Label>
                        <Select value={newRule.patternType} onValueChange={(value: any) => setNewRule(prev => ({ ...prev, patternType: value }))}>
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="regex">Regular Expression</SelectItem>
                            <SelectItem value="keyword">Exact Keyword</SelectItem>
                            <SelectItem value="contains">Contains Text</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="rule-pattern">Pattern</Label>
                      <Input
                        id="rule-pattern"
                        value={newRule.pattern}
                        onChange={(e) => setNewRule(prev => ({ ...prev, pattern: e.target.value }))}
                        placeholder={newRule.patternType === 'regex' ? '^(create|generate)\\s+database' : 'database'}
                      />
                    </div>
                    <div>
                      <Label htmlFor="rule-model">Target Model Type</Label>
                      <Select value={newRule.modelType} onValueChange={(value: any) => setNewRule(prev => ({ ...prev, modelType: value }))}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="fast">Fast Model</SelectItem>
                          <SelectItem value="smart">Smart Model</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="rule-description">Description</Label>
                      <Textarea
                        id="rule-description"
                        value={newRule.description}
                        onChange={(e) => setNewRule(prev => ({ ...prev, description: e.target.value }))}
                        placeholder="Describe when this rule should apply"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setNewRuleDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addRule} disabled={!newRule.name || !newRule.pattern}>
                      Add Rule
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>

            <div className="space-y-3">
              {settings.rules.map((rule) => (
                <div key={rule.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{rule.name}</span>
                      <Badge variant={rule.modelType === 'fast' ? 'secondary' : 'default'}>
                        {rule.modelType === 'fast' ? 'Fast' : 'Smart'}
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {rule.patternType}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      Pattern: <code className="bg-muted px-1 rounded">{rule.pattern}</code>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {rule.description}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch
                      checked={rule.enabled}
                      onCheckedChange={(checked) => updateRule(rule.id, { enabled: checked })}
                    />
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => removeRule(rule.id)}
                      className="text-destructive hover:text-destructive"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={saveSettings} disabled={loading} className="gap-2">
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
    </div>
  );
}