import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Brain, 
  Save, 
  Loader2, 
  TestTube, 
  Plus, 
  GripVertical,
  ChevronUp,
  ChevronDown,
  Trash2
} from 'lucide-react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import {
  useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';

interface AIModel {
  value: string;
  label: string;
  provider: string;
  context_window?: number;
  custom?: boolean;
  api_base?: string;
  region?: string;
  notes?: string;
}

interface ModelSettings {
  enabled_models: string[];
  default_models: string[];
  available_models: AIModel[];
}

const DEFAULT_MODELS: AIModel[] = [
  { value: 'gpt-4o-mini', label: 'GPT-4o Mini', provider: 'OpenAI', context_window: 128000 },
  { value: 'gpt-4o', label: 'GPT-4o', provider: 'OpenAI', context_window: 128000 },
  { value: 'gpt-5-2025-08-07', label: 'GPT-5', provider: 'OpenAI', context_window: 200000 },
  { value: 'gpt-5-mini-2025-08-07', label: 'GPT-5 Mini', provider: 'OpenAI', context_window: 200000 },
  { value: 'claude-3-5-sonnet', label: 'Claude 3.5 Sonnet', provider: 'Anthropic', context_window: 200000 },
  { value: 'claude-3-opus', label: 'Claude 3 Opus', provider: 'Anthropic', context_window: 200000 },
  { value: 'claude-opus-4-20250514', label: 'Claude 4 Opus', provider: 'Anthropic', context_window: 200000 },
  { value: 'gemini-pro', label: 'Gemini Pro', provider: 'Google', context_window: 128000 },
];

export function AvailableModelsTab() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState<ModelSettings>({
    enabled_models: ['gpt-4o-mini'],
    default_models: ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
    available_models: DEFAULT_MODELS
  });
  const [customModelDialog, setCustomModelDialog] = useState(false);
  const [newModel, setNewModel] = useState({
    value: '',
    label: '',
    provider: '',
    api_base: '',
    region: '',
    notes: ''
  });

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('*')
        .in('setting_key', ['ai.models', 'ai.defaults.global']);

      if (error) throw error;

      const modelsData = data?.find(s => s.setting_key === 'ai.models')?.setting_value as string[] | undefined;
      const defaultsData = data?.find(s => s.setting_key === 'ai.defaults.global')?.setting_value as any;

      if (modelsData || defaultsData) {
        setSettings({
          enabled_models: modelsData || ['gpt-4o-mini'],
          default_models: defaultsData?.default_models || ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
          available_models: DEFAULT_MODELS
        });
      }
    } catch (error) {
      console.error('Error loading settings:', error);
      toast({
        title: 'Loading Failed',
        description: 'Failed to load AI model settings.',
        variant: 'destructive',
      });
    }
  };

  const saveSettings = async () => {
    setLoading(true);
    try {
      await supabase
        .from('system_settings')
        .upsert([
          {
            setting_key: 'ai.models',
            setting_value: settings.enabled_models,
          },
          {
            setting_key: 'ai.defaults.global',
            setting_value: {
              default_models: settings.default_models,
            }
          }
        ], {
          onConflict: 'setting_key'
        });

      toast({
        title: 'Settings Saved',
        description: 'AI model configuration has been updated.',
      });
    } catch (error) {
      console.error('Error saving settings:', error);
      toast({
        title: 'Save Failed',
        description: 'Failed to save AI model settings.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleModelToggle = (modelValue: string, enabled: boolean) => {
    setSettings(prev => ({
      ...prev,
      enabled_models: enabled
        ? [...prev.enabled_models, modelValue]
        : prev.enabled_models.filter(m => m !== modelValue)
    }));
  };

  const setAsDefault = (modelValue: string) => {
    if (!settings.default_models.includes(modelValue)) {
      setSettings(prev => ({
        ...prev,
        default_models: [modelValue, ...prev.default_models.slice(0, 2)]
      }));
    }
  };

  const handleDragEnd = (event: any) => {
    const { active, over } = event;
    if (active.id !== over.id) {
      setSettings(prev => {
        const oldIndex = prev.default_models.indexOf(active.id);
        const newIndex = prev.default_models.indexOf(over.id);
        return {
          ...prev,
          default_models: arrayMove(prev.default_models, oldIndex, newIndex)
        };
      });
    }
  };

  const testModel = async (modelValue: string) => {
    setLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('ai-router', {
        body: {
          model: modelValue,
          messages: [{ role: 'user', content: 'Hello! Please respond with "Model test successful."' }],
          max_tokens: 50
        }
      });

      if (error) throw error;

      toast({
        title: 'Model Test Successful',
        description: `${modelValue} is responding correctly.`,
      });
    } catch (error) {
      console.error('Model test failed:', error);
      toast({
        title: 'Model Test Failed',
        description: `Failed to test ${modelValue}. Check your API configuration.`,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const addCustomModel = () => {
    const customModel: AIModel = {
      ...newModel,
      custom: true
    };

    setSettings(prev => ({
      ...prev,
      available_models: [...prev.available_models, customModel]
    }));

    setNewModel({
      value: '',
      label: '',
      provider: '',
      api_base: '',
      region: '',
      notes: ''
    });
    setCustomModelDialog(false);

    toast({
      title: 'Custom Model Added',
      description: 'Custom model has been added to the registry.',
    });
  };

  const SortableModelItem = ({ model, index }: { model: string; index: number }) => {
    const {
      attributes,
      listeners,
      setNodeRef,
      transform,
      transition,
    } = useSortable({ id: model });

    const style = {
      transform: CSS.Transform.toString(transform),
      transition,
    };

    const modelInfo = settings.available_models.find(m => m.value === model);

    return (
      <div ref={setNodeRef} style={style} className="flex items-center justify-between p-3 border rounded-lg bg-card">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="w-6 h-6 flex items-center justify-center text-xs">
              {index + 1}
            </Badge>
            <div {...attributes} {...listeners} className="cursor-grab">
              <GripVertical className="h-4 w-4 text-muted-foreground" />
            </div>
          </div>
          <div>
            <p className="font-medium">{modelInfo?.label}</p>
            <p className="text-sm text-muted-foreground">{modelInfo?.provider}</p>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5" />
            Available Models Registry
          </CardTitle>
          <CardDescription>
            Manage which AI models are available for use and configure their fallback order.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Default Models Fallback Order */}
          <div>
            <Label className="text-base font-medium">Default Model Fallback Chain</Label>
            <p className="text-sm text-muted-foreground mb-4">
              Drag to reorder the fallback priority. If the first model fails, the system will try the next one.
            </p>
            
            <DndContext 
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext 
                items={settings.default_models}
                strategy={verticalListSortingStrategy}
              >
                <div className="space-y-2">
                  {settings.default_models.map((model, index) => (
                    <SortableModelItem key={model} model={model} index={index} />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          </div>

          {/* Available Models */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <Label className="text-base font-medium">Model Registry</Label>
              <Dialog open={customModelDialog} onOpenChange={setCustomModelDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm" className="gap-2">
                    <Plus className="h-4 w-4" />
                    Add Custom Model
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Custom Model</DialogTitle>
                    <DialogDescription>
                      Add a custom AI model with your own API configuration.
                    </DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="model-id">Model ID</Label>
                        <Input
                          id="model-id"
                          value={newModel.value}
                          onChange={(e) => setNewModel(prev => ({ ...prev, value: e.target.value }))}
                          placeholder="gpt-4-custom"
                        />
                      </div>
                      <div>
                        <Label htmlFor="model-label">Display Name</Label>
                        <Input
                          id="model-label"
                          value={newModel.label}
                          onChange={(e) => setNewModel(prev => ({ ...prev, label: e.target.value }))}
                          placeholder="GPT-4 Custom"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="provider">Provider</Label>
                        <Input
                          id="provider"
                          value={newModel.provider}
                          onChange={(e) => setNewModel(prev => ({ ...prev, provider: e.target.value }))}
                          placeholder="OpenAI"
                        />
                      </div>
                      <div>
                        <Label htmlFor="region">Region (Optional)</Label>
                        <Input
                          id="region"
                          value={newModel.region}
                          onChange={(e) => setNewModel(prev => ({ ...prev, region: e.target.value }))}
                          placeholder="us-east-1"
                        />
                      </div>
                    </div>
                    <div>
                      <Label htmlFor="api-base">API Base URL (Optional)</Label>
                      <Input
                        id="api-base"
                        value={newModel.api_base}
                        onChange={(e) => setNewModel(prev => ({ ...prev, api_base: e.target.value }))}
                        placeholder="https://api.openai.com/v1"
                      />
                    </div>
                    <div>
                      <Label htmlFor="notes">Notes (Optional)</Label>
                      <Input
                        id="notes"
                        value={newModel.notes}
                        onChange={(e) => setNewModel(prev => ({ ...prev, notes: e.target.value }))}
                        placeholder="Custom configuration notes"
                      />
                    </div>
                  </div>
                  <DialogFooter>
                    <Button variant="outline" onClick={() => setCustomModelDialog(false)}>
                      Cancel
                    </Button>
                    <Button onClick={addCustomModel} disabled={!newModel.value || !newModel.label}>
                      Add Model
                    </Button>
                  </DialogFooter>
                </DialogContent>
              </Dialog>
            </div>
            
            <div className="space-y-3">
              {settings.available_models.map((model) => (
                <div key={model.value} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex-1 grid grid-cols-4 gap-4">
                    <div>
                      <p className="font-medium">{model.label}</p>
                      <p className="text-sm text-muted-foreground">{model.provider}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium">Context</p>
                      <p className="text-sm text-muted-foreground">
                        {model.context_window ? `${model.context_window.toLocaleString()} tokens` : 'Unknown'}
                      </p>
                    </div>
                    <div>
                      <Badge variant={settings.enabled_models.includes(model.value) ? 'default' : 'secondary'}>
                        {settings.enabled_models.includes(model.value) ? 'Enabled' : 'Disabled'}
                      </Badge>
                      {settings.default_models[0] === model.value && (
                        <Badge variant="outline" className="ml-2">Default</Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <Switch
                        checked={settings.enabled_models.includes(model.value)}
                        onCheckedChange={(checked) => handleModelToggle(model.value, checked)}
                      />
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => setAsDefault(model.value)}
                        disabled={settings.default_models[0] === model.value}
                      >
                        Set Default
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testModel(model.value)}
                        disabled={loading || !settings.enabled_models.includes(model.value)}
                        className="gap-1"
                      >
                        <TestTube className="h-3 w-3" />
                        Test
                      </Button>
                    </div>
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
              Save Changes
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}