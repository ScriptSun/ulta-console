import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { Brain, Settings, MessageSquare, Zap } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { AvailableModelsTab } from '@/components/ai/AvailableModelsTab';
import { ModelConfigurationTab } from '@/components/ai/ModelConfigurationTab';
import { SystemPromptTab } from '@/components/ai/SystemPromptTab';
import { IntelligentSelectionTab } from '@/components/ai/IntelligentSelectionTab';

export default function AiSettings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);
  const [hasInitialized, setHasInitialized] = useState(false);

  // Get active tab from URL parameters
  const activeTab = searchParams.get('tab') || 'models';

  useEffect(() => {
    if (user && !hasInitialized) {
      checkUserRole();
      migrateOldSettings();
      setHasInitialized(true);
    }
  }, [user, hasInitialized]);

  const checkUserRole = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('console_team_members')
        .select('role')
        .eq('admin_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('Error checking user role:', error);
        return;
      }

      if (data) {
        setUserRole(data.role);
        setIsOwnerOrAdmin(['Owner', 'Admin'].includes(data.role));
      }
    } catch (error) {
      console.error('Error checking user role:', error);
    }
  };

  const migrateOldSettings = async () => {
    try {
      // Check if old ai_models setting exists
      const { data: oldSettings, error } = await supabase
        .from('system_settings')
        .select('*')
        .eq('setting_key', 'ai_models')
        .maybeSingle();

      if (error && error.code !== 'PGRST116') { // Not found error is ok
        console.error('Error checking old settings:', error);
        return;
      }

      if (oldSettings) {
        const oldValue = oldSettings.setting_value as any;
        
        // Migrate to new storage keys
        const newKeys = [
          { key: 'ai.models', value: oldValue.enabled_models || ['gpt-4o-mini'] },
          { key: 'ai.defaults.global', value: {
            default_models: oldValue.default_models || ['gpt-4o-mini', 'gpt-4o', 'claude-3-5-sonnet'],
            max_tokens: oldValue.max_tokens || 4000,
            temperature: oldValue.temperature || 0.7,
          }},
          { key: 'ai.systemPrompt', value: {
            content: 'You are a helpful AI assistant.',
            version: 1,
            published: true,
            created_at: new Date().toISOString(),
            author: user?.email || 'system'
          }}
        ];

        for (const newSetting of newKeys) {
          await supabase
            .from('system_settings')
            .upsert({
              setting_key: newSetting.key,
              setting_value: newSetting.value,
            }, {
              onConflict: 'setting_key'
            });
        }

        // Mark migration complete
        await supabase
          .from('system_settings')
          .upsert({
            setting_key: 'ai_migration_complete',
            setting_value: { migrated_at: new Date().toISOString() }
          }, {
            onConflict: 'setting_key'
          });

        toast({
          title: 'AI Settings Migrated',
          description: 'AI settings have been moved to AI Settings page.',
        });
      }
    } catch (error) {
      console.error('Error migrating settings:', error);
    }
  };

  const handleTabChange = (value: string) => {
    setSearchParams({ tab: value });
  };

  if (!isOwnerOrAdmin) {
    return (
      <div className="container mx-auto max-w-6xl space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold text-foreground">AI Settings</h1>
          <p className="text-muted-foreground">
            Configure AI models, parameters, and system prompts for your platform.
          </p>
        </div>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-center">
            <h2 className="text-2xl font-semibold mb-2">Access Denied</h2>
            <p className="text-muted-foreground">
              You need Owner or Admin permissions to access AI Settings.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto max-w-6xl space-y-6">
      <div className="space-y-2">
        <h1 className="text-3xl font-bold text-foreground">AI Settings</h1>
        <p className="text-muted-foreground">
          Configure AI models, parameters, and system prompts for your platform.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="models" className="flex items-center gap-2">
            <Brain className="h-4 w-4" />
            Models
          </TabsTrigger>
          <TabsTrigger value="configuration" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            Configuration
          </TabsTrigger>
          <TabsTrigger value="prompts" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            System Prompts
          </TabsTrigger>
          <TabsTrigger value="intelligent" className="flex items-center gap-2">
            <Zap className="h-4 w-4" />
            Intelligent Selection
          </TabsTrigger>
        </TabsList>

        <TabsContent value="models" className="space-y-6">
          <AvailableModelsTab />
        </TabsContent>

        <TabsContent value="configuration" className="space-y-6">
          <ModelConfigurationTab />
        </TabsContent>

        <TabsContent value="prompts" className="space-y-6">
          <SystemPromptTab />
        </TabsContent>

        <TabsContent value="intelligent" className="space-y-6">
          <IntelligentSelectionTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}