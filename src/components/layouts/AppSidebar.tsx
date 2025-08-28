
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
  Globe
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

const mainItems = [
  { title: 'Dashboard', url: '/dashboard', icon: LayoutDashboard },
  { title: 'Agents', url: '/agents', icon: Bot },
  { title: 'Chat Inbox', url: '/chat/inbox', icon: MessageSquare },
  { title: 'Batches', url: '/scripts/batches', icon: Package },
  { title: 'Tasks', url: '/tasks', icon: CheckSquare },
]

const monitoringItems = [
  { title: 'Quotas & Usage', url: '/quotas', icon: BarChart3 },
  { title: 'Plans', url: '/plans', icon: CreditCard },
]

const securityItems = [
  { title: 'Command Policies', url: '/security/command-policies', icon: Shield },
  { title: 'Security Center', url: '/security', icon: Shield },
  { title: 'API Keys', url: '/api-keys', icon: Key },
]

const toolsItems = [
  { title: 'Widget Guide', url: '/widget-guide', icon: Globe },
  { title: 'Integrations', url: '/integrations', icon: Puzzle },
  { title: 'Team Management', url: '/team-management', icon: Users },
  { title: 'Assertion Check', url: '/assertion-check', icon: TestTube },
]

// AppSidebar Component - Navigation menu without Scripts section
export function AppSidebar() {
  const { state } = useSidebar()
  const location = useLocation()
  const currentPath = location.pathname
  const collapsed = state === 'collapsed'

  const isActive = (path: string) => {
    if (path === '/dashboard' && currentPath === '/') return true
    return currentPath === path
  }

  const NavItem = ({ item }: { item: typeof mainItems[0] }) => (
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
            {!collapsed && 'Tools'}
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
