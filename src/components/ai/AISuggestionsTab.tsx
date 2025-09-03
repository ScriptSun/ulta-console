import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { Bot } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export function AISuggestionsTab() {
  const { toast } = useToast();
  const [aiSuggestionsMode, setAiSuggestionsMode] = useState<'off' | 'show' | 'execute'>('off');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      // Fetch AI suggestions mode from system_settings using new schema
      const { data, error } = await supabase
        .from('system_settings')
        .select('setting_value')
        .eq('setting_key', 'ai_suggestions_mode')
        .single();

      if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows found
      
      setAiSuggestionsMode(data?.setting_value as 'off' | 'show' | 'execute' || 'off');
    } catch (error) {
      console.error('Error fetching system settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to load system settings',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const updateAiSuggestionsMode = async (mode: 'off' | 'show' | 'execute') => {
    try {
      const { error } = await supabase
        .from('system_settings')
        .upsert({ 
          setting_key: 'ai_suggestions_mode',
          setting_value: mode,
          description: 'AI suggestions mode configuration'
        });

      if (error) throw error;

      setAiSuggestionsMode(mode);
      toast({
        title: 'Settings Updated',
        description: `AI Suggestions Mode set to ${mode}`,
      });
    } catch (error) {
      console.error('Error updating system settings:', error);
      toast({
        title: 'Error',
        description: 'Failed to update system settings',
        variant: 'destructive',
      });
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Bot className="h-5 w-5" />
            AI Suggestions Configuration
          </CardTitle>
          <CardDescription>
            Configure how AI suggestions are displayed and executed throughout the platform
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="space-y-2">
                <h4 className="text-sm font-medium">Suggestion Mode</h4>
                <p className="text-sm text-muted-foreground">
                  Choose how AI suggestions should behave across the platform
                </p>
              </div>
              <ToggleGroup
                type="single"
                value={aiSuggestionsMode}
                onValueChange={(value) => value && updateAiSuggestionsMode(value as 'off' | 'show' | 'execute')}
                className="grid grid-cols-1 gap-3"
              >
                <ToggleGroupItem 
                  value="off" 
                  className="justify-start px-4 py-3 h-auto data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:border-primary/20"
                >
                  <div className="text-left space-y-1">
                    <div className="font-medium">Off</div>
                    <div className="text-xs text-muted-foreground">
                      Disable all AI suggestions and automated command recommendations
                    </div>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="show" 
                  className="justify-start px-4 py-3 h-auto data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:border-primary/20"
                >
                  <div className="text-left space-y-1">
                    <div className="font-medium">Show Only</div>
                    <div className="text-xs text-muted-foreground">
                      Display AI suggestions and safe commands for review (no automatic execution)
                    </div>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="execute" 
                  className="justify-start px-4 py-3 h-auto data-[state=on]:bg-primary/10 data-[state=on]:text-foreground data-[state=on]:border-primary/20"
                >
                  <div className="text-left space-y-1">
                    <div className="font-medium">Show with Execute</div>
                    <div className="text-xs text-muted-foreground">
                      Show AI suggestions with "Execute" buttons for immediate action
                    </div>
                  </div>
                </ToggleGroupItem>
              </ToggleGroup>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>How AI Suggestions Work</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm space-y-2">
            <p>• <strong>Off:</strong> No AI suggestions will be shown anywhere in the platform</p>
            <p>• <strong>Show Only:</strong> AI will suggest commands and actions, but users must manually copy/execute them</p>
            <p>• <strong>Show with Execute:</strong> AI suggestions include one-click execute buttons for immediate action</p>
            <p>• <strong>Security:</strong> All suggestions go through safety filters regardless of the mode selected</p>
            <p>• <strong>Scope:</strong> This setting affects chat interfaces, command suggestions, and automated recommendations</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}