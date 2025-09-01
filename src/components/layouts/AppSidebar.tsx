
import { 
  LayoutDashboard, 
  Bot, 
  CheckSquare, 
  Key, 
  CreditCard,
  Shield,
  Puzzle,
  TestTube,
  Users,
  Package,
  MessageSquare,
  Globe,
  ClipboardCheck,
  Rocket,
  Brain
} from 'lucide-react'
import { Link, useLocation } from 'react-router-dom'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar
} from '@/components/ui/sidebar'
import { cn } from '@/lib/utils'
import { usePagePermissions } from '@/hooks/usePagePermissions'
import { useCompanyLogo } from '@/hooks/useCompanyLogo'
import { useTheme } from 'next-themes'

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
  { title: 'Users', url: '/users', icon: Users, pageKey: 'users' },
  { title: 'Agents', url: '/agents', icon: Bot, pageKey: 'agents' },
  { title: 'Chat Inbox', url: '/chat/inbox', icon: MessageSquare, pageKey: 'chat' },
  { title: 'Templates & Scripts', url: '/scripts/batches', icon: Package, pageKey: 'scripts' },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare, pageKey: 'tasks' },
]

const securityItems = [
  { title: 'Security Dashboard', url: '/security/dashboard', icon: Shield, pageKey: 'security' },
  { title: 'Command Policies', url: '/security/command-policies', icon: Shield, pageKey: 'policies' },
  { title: 'Security Center', url: '/security', icon: Shield, pageKey: 'security' },
  { title: 'API Keys', url: '/api-keys', icon: Key, pageKey: 'api_keys' },
]

const toolsItems = [
  { title: 'Plans', url: '/plans', icon: CreditCard, pageKey: 'plans' },
  { title: 'Widget Management', url: '/widget-management', icon: Globe, pageKey: 'widgets' },
  { title: 'Deployment Checklist', url: '/deployment-checklist', icon: Rocket, pageKey: 'deployment' },
  { title: 'Integrations', url: '/integrations', icon: Puzzle, pageKey: 'integrations' },
  { title: 'Access Control', url: '/access-control', icon: Users, pageKey: 'teams' },
  { title: 'AI Settings', url: '/ai-settings', icon: Brain, pageKey: 'ai-settings' },
  { title: 'Assertion Check', url: '/assertion-check', icon: TestTube, pageKey: 'qa' },
]

// AppSidebar Component - Navigation menu with Winster Hub inspired design
export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === 'collapsed'
  const { canView } = usePagePermissions()
  const { logoSettings } = useCompanyLogo()
  const { theme } = useTheme()

  const isActive = (path: string) => {
    if (path === '/dashboard' && currentPath === '/') return true
    return currentPath === path
  }

  const NavItem = ({ item }: { item: typeof mainItems[0] }) => {
    // Check permissions properly
    let hasPermission = true;
    
    try {
      if (item.pageKey) {
        hasPermission = canView(item.pageKey);
        console.log(`NavItem: ${item.title} (${item.pageKey}) - permission: ${hasPermission}`);
      }
    } catch (error) {
      console.warn(`Permission check failed for pageKey: ${item.pageKey}`, error);
      hasPermission = false; // Be strict about permissions
    }
    
    if (!hasPermission) return null;
    
    const active = isActive(item.url);
    
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link 
            to={item.url}
            className={cn(
              'flex items-center gap-3 px-6 py-5 rounded-lg transition-all duration-300 group',
              'hover:bg-sidebar-accent/50 hover:backdrop-blur-sm',
              active && 'bg-sidebar-accent shadow-lg backdrop-blur-sm'
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0 transition-all duration-300",
              active ? 'text-sidebar-primary' : 'text-sidebar-foreground/70 group-hover:text-sidebar-foreground'
            )} />
            {!collapsed && (
              <span className={cn(
                "truncate font-medium transition-all duration-300",
                active ? 'text-sidebar-primary' : 'text-sidebar-foreground group-hover:text-sidebar-foreground'
              )}>
                {item.title}
              </span>
            )}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar className="border-r-0 bg-sidebar shadow-2xl">
      <SidebarContent className="px-0 py-6 overflow-y-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 mb-8">
          {(() => {
            const logoUrl = theme === 'dark' ? logoSettings.logo_dark_url : logoSettings.logo_light_url;
            const hasLogo = logoUrl && logoUrl.length > 0;
            
            return hasLogo ? (
              <>
                <img
                  src={`${logoUrl}?t=${Date.now()}`}
                  alt="Company Logo"
                  className="object-contain"
                  style={{
                    width: `${logoSettings.logo_width}px`,
                    height: `${logoSettings.logo_height}px`
                  }}
                />
              </>
            ) : (
              <>
                <div className="h-10 w-10 rounded-xl bg-sidebar-primary flex items-center justify-center shadow-lg">
                  <Bot className="h-5 w-5 text-sidebar-primary-foreground" />
                </div>
                {!collapsed && (
                  <div className="flex flex-col">
                    <span className="font-bold text-sidebar-foreground text-lg">UltaAI</span>
                    <span className="text-xs text-sidebar-primary font-medium">Control Hub</span>
                  </div>
                )}
              </>
            );
          })()}
        </div>

        {/* Main Navigation */}
        <div className="space-y-6">
          <SidebarGroup>
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {mainItems.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Security */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-primary uppercase tracking-wider px-6 mb-2">
                Security
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {securityItems.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Configure */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-sidebar-primary uppercase tracking-wider px-6 mb-2">
                Configure
              </SidebarGroupLabel>
            )}
            <SidebarGroupContent>
              <SidebarMenu className="space-y-1">
                {toolsItems.map((item) => (
                  <NavItem key={item.title} item={item} />
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </div>

        {/* Bottom spacing */}
        <div className="flex-1" />
      </SidebarContent>
    </Sidebar>
  )
}
