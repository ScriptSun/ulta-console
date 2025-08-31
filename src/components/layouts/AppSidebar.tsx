
import { 
  LayoutDashboard, 
  Bot, 
  CheckSquare, 
  Key, 
  BarChart3, 
  CreditCard,
  Shield,
  Puzzle,
  TestTube,
  FileText,
  Users,
  Package,
  MessageSquare,
  Globe,
  ClipboardCheck,
  Rocket
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

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard, pageKey: 'dashboard' },
  { title: 'Users', url: '/users', icon: Users, pageKey: 'users' },
  { title: 'Agents', url: '/agents', icon: Bot, pageKey: 'agents' },
  { title: 'Chat Inbox', url: '/chat/inbox', icon: MessageSquare, pageKey: 'chat' },
  { title: 'Templates & Scripts', url: '/scripts/batches', icon: Package, pageKey: 'scripts' },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare, pageKey: 'tasks' },
]

const monitoringItems = [
  { title: 'Quotas & Usage', url: '/quotas', icon: BarChart3, pageKey: 'quotas' },
  { title: 'Plans', url: '/plans', icon: CreditCard, pageKey: 'plans' },
]

const securityItems = [
  { title: 'Security Dashboard', url: '/security/dashboard', icon: Shield, pageKey: 'security' },
  { title: 'Command Policies', url: '/security/command-policies', icon: Shield, pageKey: 'policies' },
  { title: 'Security Center', url: '/security', icon: Shield, pageKey: 'security' },
  { title: 'API Keys', url: '/api-keys', icon: Key, pageKey: 'api_keys' },
]

const toolsItems = [
  { title: 'Widget Management', url: '/widget-management', icon: Globe, pageKey: 'widgets' },
  { title: 'Deployment Checklist', url: '/deployment-checklist', icon: Rocket, pageKey: 'deployment' },
  { title: 'Integrations', url: '/integrations', icon: Puzzle, pageKey: 'integrations' },
  { title: 'Access Control', url: '/access-control', icon: Users, pageKey: 'teams' },
  { title: 'Assertion Check', url: '/assertion-check', icon: TestTube, pageKey: 'qa' },
]

// AppSidebar Component - Navigation menu without Scripts section
export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === 'collapsed'
  const { canView } = usePagePermissions()

  const isActive = (path: string) => {
    if (path === '/dashboard' && currentPath === '/') return true
    return currentPath === path
  }

  const NavItem = ({ item }: { item: typeof mainItems[0] }) => {
    // Safe fallback: if pageKey is missing or permission check fails, 
    // default to showing the item to prevent blank sidebar
    let hasPermission = true;
    
    try {
      if (item.pageKey) {
        hasPermission = canView(item.pageKey);
      }
    } catch (error) {
      console.warn(`Permission check failed for pageKey: ${item.pageKey}`, error);
      hasPermission = true; // Safe fallback - show the item
    }
    
    if (!hasPermission) return null;
    
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link 
            to={item.url}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg transition-smooth hover:bg-sidebar-accent',
              isActive(item.url) && 'bg-primary text-primary-foreground shadow-glow'
            )}
          >
            <item.icon className="h-4 w-4 flex-shrink-0" />
            {!collapsed && <span className="truncate">{item.title}</span>}
          </Link>
        </SidebarMenuButton>
      </SidebarMenuItem>
    )
  }

  return (
    <Sidebar className="border-r border-sidebar-border bg-sidebar shadow-lg">
      <SidebarContent className="px-2 py-4">
        {/* Logo */}
        <div className="flex items-center gap-2 px-3 py-4 mb-6">
          <div className="h-8 w-8 rounded-lg bg-gradient-primary flex items-center justify-center">
            <FileText className="h-4 w-4 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-semibold text-sidebar-foreground">UltaAI</span>
              <span className="text-xs text-muted-foreground">Control</span>
            </div>
          )}
        </div>

        {/* Main Navigation */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {!collapsed && 'Main'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {mainItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Monitoring */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {!collapsed && 'Monitoring'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {monitoringItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Security */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {!collapsed && 'Security'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {securityItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Tools */}
        <SidebarGroup>
          <SidebarGroupLabel className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
            {!collapsed && 'Configure'}
          </SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu className="space-y-1">
              {toolsItems.map((item) => (
                <NavItem key={item.title} item={item} />
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
