
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

// AppSidebar Component - Navigation menu with Winster Hub inspired design
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
    
    const active = isActive(item.url);
    
    return (
      <SidebarMenuItem>
        <SidebarMenuButton asChild>
          <Link 
            to={item.url}
            className={cn(
              'flex items-center gap-3 px-6 py-5 mx-4 rounded-lg transition-all duration-300 group',
              'hover:bg-white/5 hover:backdrop-blur-sm',
              active && 'bg-gradient-to-r from-blue-600/20 to-purple-600/20 shadow-lg shadow-blue-500/10 backdrop-blur-sm'
            )}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0 transition-all duration-300",
              active ? 'text-blue-300' : 'text-gray-400 group-hover:text-gray-300'
            )} />
            {!collapsed && (
              <span className={cn(
                "truncate font-medium transition-all duration-300",
                active ? 'text-white' : 'text-gray-300 group-hover:text-white'
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
    <Sidebar className="border-r-0 bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 shadow-2xl">
      <SidebarContent className="px-0 py-6 overflow-y-auto scrollbar-none"
        style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* Logo Section */}
        <div className="flex items-center gap-3 px-6 mb-8">
          <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
            <FileText className="h-5 w-5 text-white" />
          </div>
          {!collapsed && (
            <div className="flex flex-col">
              <span className="font-bold text-white text-lg">UltaAI</span>
              <span className="text-xs text-blue-300 font-medium">Control Hub</span>
            </div>
          )}
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

          {/* Monitoring */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 mb-2">
                Monitoring
              </SidebarGroupLabel>
            )}
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
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 mb-2">
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

          {/* Tools */}
          <SidebarGroup>
            {!collapsed && (
              <SidebarGroupLabel className="text-xs font-semibold text-gray-400 uppercase tracking-wider px-6 mb-2">
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
