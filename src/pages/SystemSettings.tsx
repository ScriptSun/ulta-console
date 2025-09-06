import React, { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { 
  Settings, 
  Cpu, 
  Shield, 
  Bell, 
  Database,
  Save,
  Loader2,
  AlertTriangle,
  CheckCircle,
  Globe,
  Zap,
  Brain,
  GripVertical,
  ChevronUp,
  ChevronDown,
  MessageSquare,
  Bot,
  Palette,
  Crown,
  ExternalLink
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Slider } from '@/components/ui/slider';
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
import { AITestPanel } from '@/components/ai/AITestPanel';
import { CompanyLogoSection } from '@/components/settings/CompanyLogoSection';
import { ThemeSelector } from '@/components/theme/ThemeSelector';
import { ThemeCustomizer } from '@/components/theme/ThemeCustomizer';
import { useNavigate } from 'react-router-dom';
import { LogoFaviconManager } from '@/components/brand/LogoFaviconManager';
import { OSTargetsManager } from '@/components/settings/OSTargetsManager';
import { 
  ArrowRight,
  Image,
  Mail
} from 'lucide-react';

interface SystemSetting {
  id: string;
  setting_key: string;
  setting_value: any;
  description: string;
  created_at: string;
  updated_at: string;
}

const systemSections = [
  {
    title: 'AI Models',
    description: 'Configure AI model selection and failover',
    icon: Bot,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statsLine: 'Model selection, Failover, Temperature settings',
    action: 'Configure',
    href: '/system-settings/ai-models'
  },
  {
    title: 'API & Limits',
    description: 'Set rate limits and API configurations',
    icon: Zap,
    color: 'text-orange-600',
    bgColor: 'bg-orange-100',
    statsLine: 'Rate limits, Timeouts, Concurrent requests',
    action: 'Configure',
    href: '/system-settings/api-limits'
  },
  {
    title: 'Configure OS',
    description: 'Manage operating system targets and versions',
    icon: Cpu,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    statsLine: 'OS targets, Versions, Batch script compatibility',
    action: 'Configure',
    id: 'os-targets'
  },
  {
    title: 'Security',
    description: 'Security policies and authentication',
    icon: Shield,
    color: 'text-green-600',
    bgColor: 'bg-green-100',
    statsLine: '2FA, Session timeout, Password policies',
    action: 'Configure',
    href: '/system-settings/security'
  },
  {
    title: 'Notifications',
    description: 'Email, Slack, and Telegram alerts',
    icon: Bell,
    color: 'text-blue-600',
    bgColor: 'bg-blue-100',
    statsLine: 'Email, Telegram, Webhooks',
    action: 'Configure',
    href: '/system-settings/notifications'
  },
  {
    title: 'Upgrade',
    description: 'Plan upgrade configuration',
    icon: Crown,
    color: 'text-purple-600',
    bgColor: 'bg-purple-100',
    statsLine: 'Upgrade URL configuration',
    action: 'Configure',
    href: '/system-settings/upgrade'
  }
];

const brandSections = [
  {
    title: 'Logos and Favicon',
    description: 'Manage your brand logos and generate favicons',
    icon: Image,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statsLine: 'Light logo, Dark logo, Email logo, Favicon set',
    action: 'Manage',
    id: 'logos-favicon'
  },
  {
    title: 'Theme Colors',
    description: 'Customize your brand color palette',
    icon: Palette,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statsLine: 'Primary, Secondary, Accent colors configured',
    action: 'Customize',
    id: 'theme-colors',
    href: '/system-settings/brand/theme'
  },
  {
    title: 'Email Branding',
    description: 'Configure sender identity and email templates',
    icon: Mail,
    color: 'text-primary',
    bgColor: 'bg-primary/10',
    statsLine: 'Sender identity, 5 email templates, MJML editor',
    action: 'Configure',
    id: 'email-branding',
    href: '/system-settings/brand/email'
  }
];

export default function SystemSettings() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const [activeSection, setActiveSection] = React.useState<string | null>(null);
  const [userRole, setUserRole] = useState<string | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(false);

  useEffect(() => {
    if (user) {
      checkUserRole();
    }
  }, [user]);

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

  const handleSectionClick = (sectionId: string, href?: string) => {
    if (href) {
      navigate(href);
    } else {
      setActiveSection(sectionId);
    }
  };

  const handleCloseDrawer = () => {
    setActiveSection(null);
  };


  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-3xl font-bold flex items-center gap-3">
          <Settings className="h-8 w-8 text-primary" />
          System Settings
        </h1>
        <p className="text-muted-foreground">
          Configure system-wide settings for your UltaAI platform including AI models, security, and performance.
        </p>
      </div>

      {/* Brand Center Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Palette className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">Brand Center</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {brandSections.map((section) => {
            const Icon = section.icon;
            return (
              <Card key={section.id} className="group hover:shadow-md transition-smooth">
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
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {section.statsLine}
                  </div>
                  <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleSectionClick(section.id, (section as any).href)}
                  >
                    {section.action}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* System Configuration Section */}
      <div className="space-y-4">
        <div className="flex items-center gap-3">
          <Settings className="h-6 w-6 text-primary" />
          <h2 className="text-xl font-semibold">System Configuration</h2>
        </div>
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {systemSections.map((section) => {
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
                <CardContent className="space-y-4">
                  <div className="text-sm text-muted-foreground">
                    {section.statsLine}
                  </div>
                   <Button 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleSectionClick((section as any).id || section.title, (section as any).href)}
                  >
                    {section.action}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Logo and Favicon Manager Drawer */}
      {activeSection === 'logos-favicon' && (
        <LogoFaviconManager 
          open={true}
          onClose={handleCloseDrawer}
        />
      )}

      {/* OS Targets Manager Drawer */}
      {activeSection === 'os-targets' && (
        <OSTargetsManager 
          open={true}
          onClose={handleCloseDrawer}
        />
      )}
    </div>
  );
}