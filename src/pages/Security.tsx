import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { 
  Shield, 
  Activity, 
  Key, 
  Lock,
  Users,
  FileText,
  ArrowRight,
  Bot
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';

const securitySections = [
  {
    title: 'Audit Trail',
    description: 'Complete activity log and security audit trail',
    icon: Activity,
    url: '/security/audit',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Access Control', 
    description: 'User roles and permission management',
    icon: Users,
    url: '/security/access',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'API Security',
    description: 'API keys and authentication settings',
    icon: Key,
    url: '/api-keys',
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10',
  },
  {
    title: 'Compliance',
    description: 'Security policies and compliance reports',
    icon: FileText,
    url: '/security/compliance',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export default function Security() {
  const { toast } = useToast();
  const [aiSuggestionsMode, setAiSuggestionsMode] = useState<'off' | 'show' | 'execute'>('off');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSystemSettings();
  }, []);

  const fetchSystemSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('system_settings')
        .select('ai_suggestions_mode')
        .eq('id', '00000000-0000-0000-0000-000000000001')
        .single();

      if (error) throw error;
      
      setAiSuggestionsMode(data.ai_suggestions_mode as 'off' | 'show' | 'execute');
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
        .update({ 
          ai_suggestions_mode: mode,
          updated_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', '00000000-0000-0000-0000-000000000001');

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
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage security settings, audit trails, and compliance
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {securitySections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="group hover:shadow-md transition-smooth">
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {section.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth" />
                </CardTitle>
                <CardDescription>
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to={section.url}>
                    Access {section.title}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}

        {/* AI Suggestions Card */}
        <Card className="group hover:shadow-md transition-smooth">
          <CardHeader className="pb-4">
            <div className="w-12 h-12 rounded-lg bg-violet-500/10 flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-violet-500" />
            </div>
            <CardTitle>AI Suggestions</CardTitle>
            <CardDescription>
              Configure how AI suggestions are displayed and executed
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="flex justify-center">
                <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
              </div>
            ) : (
              <ToggleGroup
                type="single"
                value={aiSuggestionsMode}
                onValueChange={(value) => value && updateAiSuggestionsMode(value as 'off' | 'show' | 'execute')}
                className="grid grid-cols-1 gap-2"
              >
                <ToggleGroupItem 
                  value="off" 
                  className="justify-start px-3 py-2 h-auto data-[state=on]:bg-muted data-[state=on]:text-foreground"
                >
                  <div className="text-left">
                    <div className="font-medium">Off</div>
                    <div className="text-xs text-muted-foreground">No AI suggestions</div>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="show" 
                  className="justify-start px-3 py-2 h-auto data-[state=on]:bg-muted data-[state=on]:text-foreground"
                >
                  <div className="text-left">
                    <div className="font-medium">Show</div>
                    <div className="text-xs text-muted-foreground">Display safe commands (no execution)</div>
                  </div>
                </ToggleGroupItem>
                <ToggleGroupItem 
                  value="execute" 
                  className="justify-start px-3 py-2 h-auto data-[state=on]:bg-muted data-[state=on]:text-foreground"
                >
                  <div className="text-left">
                    <div className="font-medium">Execute</div>
                    <div className="text-xs text-muted-foreground">Show commands with Execute button</div>
                  </div>
                </ToggleGroupItem>
              </ToggleGroup>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Security Overview */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Sessions</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">
              Current user sessions
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">API Keys</CardTitle>
            <Key className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">8</div>
            <p className="text-xs text-muted-foreground">
              Active API keys
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Failed Logins</CardTitle>
            <Lock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">0</div>
            <p className="text-xs text-muted-foreground">
              Last 24 hours
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Security Score</CardTitle>
            <Shield className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-success-foreground">A+</div>
            <p className="text-xs text-muted-foreground">
              Excellent security
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}