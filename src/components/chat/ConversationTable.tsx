import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  RefreshCw, 
  Search, 
  MessageSquare, 
  Clock, 
  User, 
  Bot,
  Filter,
  MoreVertical,
  CalendarIcon
} from "lucide-react";
import { formatDistanceToNow, format } from "date-fns";
import { Link } from "react-router-dom";

interface Conversation {
  id: string;
  tenant_id: string;
  user_id: string | null;
  agent_id: string;
  session_id: string | null;
  source: string;
  started_at: string;
  closed_at: string | null;
  status: string;
  last_intent: string | null;
  last_action: string | null;
  meta: any;
  created_at: string;
  updated_at: string;
  agents?: {
    id: string;
    hostname: string | null;
    status: string;
    version: string | null;
  };
  _count?: {
    chat_messages: number;
    chat_events: number;
  };
}

interface ConversationTableProps {
  conversations: Conversation[];
  loading: boolean;
  onConversationSelect: (conversation: Conversation) => void;
  onRefresh: () => void;
}

export function ConversationTable({ 
  conversations, 
  loading, 
  onConversationSelect, 
  onRefresh 
}: ConversationTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string | null>(null);
  const [agentFilter, setAgentFilter] = useState<string | null>(null);
  const [sourceFilter, setSourceFilter] = useState<string | null>(null);
  const [dateFilter, setDateFilter] = useState<Date | null>(null);

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = searchQuery === "" || 
      conversation.agents?.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.session_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.last_intent?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.user_id?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === null || conversation.status === statusFilter;
    const matchesAgent = agentFilter === null || conversation.agent_id === agentFilter;
    const matchesSource = sourceFilter === null || conversation.source === sourceFilter;
    const matchesDate = dateFilter === null || 
      new Date(conversation.started_at).toDateString() === dateFilter.toDateString();
    
    return matchesSearch && matchesStatus && matchesAgent && matchesSource && matchesDate;
  });

  // Get unique agents and sources for filters
  const uniqueAgents = Array.from(new Set(conversations.map(c => c.agent_id)))
    .map(id => ({
      id,
      hostname: conversations.find(c => c.agent_id === id)?.agents?.hostname || `Agent-${id.slice(0, 8)}`
    }));
  
  const uniqueSources = Array.from(new Set(conversations.map(c => c.source)));

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      // Positive statuses - use Active design from Agents table
      open: { 
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success'
      },
      active: { 
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success'
      },
      // Warning/neutral statuses
      closed: { 
        variant: 'secondary' as const,
        className: 'bg-muted/50 text-muted-foreground border-muted/20 hover:bg-muted/70',
        dot: 'bg-muted-foreground'
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'outline' as const,
      className: '',
      dot: 'bg-muted-foreground'
    };
    
    return (
      <Badge variant={config.variant} className={`${config.className} gap-1.5 font-medium`}>
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <span>{status}</span>
      </Badge>
    );
  };

  const getAgentStatusBadge = (status: string) => {
    const statusConfig = {
      // Positive statuses - use Active design from Agents table
      online: { 
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success'
      },
      active: { 
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success'
      },
      // Negative statuses
      offline: { 
        variant: 'destructive' as const,
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        dot: 'bg-destructive'
      },
    };

    const config = statusConfig[status as keyof typeof statusConfig] || {
      variant: 'outline' as const,
      className: '',
      dot: 'bg-muted-foreground'
    };
    
    return (
      <Badge variant={config.variant} className={`${config.className} gap-1 font-medium text-xs`}>
        <div className={`w-1.5 h-1.5 rounded-full ${config.dot}`} />
        <span>{status}</span>
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      website: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      billing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      whmcs: "bg-primary/10 text-primary dark:bg-primary/20 dark:text-primary-foreground",
    };
    
    return (
      <Badge className={colors[source] || "bg-muted/20 text-muted-foreground border border-border"}>
        {source}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-muted/30 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-muted/20 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex flex-wrap items-center gap-4">
        <div className="relative flex-1 min-w-[200px] max-w-sm">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-8"
          />
        </div>
        
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Status
              {statusFilter && <Badge className="ml-2">{statusFilter}</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setStatusFilter(null)}>
              All Status
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("open")}>
              Open
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setStatusFilter("closed")}>
              Closed
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Bot className="h-4 w-4 mr-2" />
              Agent
              {agentFilter && <Badge className="ml-2">Selected</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setAgentFilter(null)}>
              All Agents
            </DropdownMenuItem>
            {uniqueAgents.map((agent) => (
              <DropdownMenuItem key={agent.id} onClick={() => setAgentFilter(agent.id)}>
                {agent.hostname}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Source
              {sourceFilter && <Badge className="ml-2">{sourceFilter}</Badge>}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent>
            <DropdownMenuItem onClick={() => setSourceFilter(null)}>
              All Sources
            </DropdownMenuItem>
            {uniqueSources.map((source) => (
              <DropdownMenuItem key={source} onClick={() => setSourceFilter(source)}>
                {source}
              </DropdownMenuItem>
            ))}
          </DropdownMenuContent>
        </DropdownMenu>

        <Popover>
          <PopoverTrigger asChild>
            <Button variant="outline" size="sm">
              <CalendarIcon className="h-4 w-4 mr-2" />
              Date
              {dateFilter && <Badge className="ml-2">{format(dateFilter, 'MMM d')}</Badge>}
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={dateFilter}
              onSelect={setDateFilter}
              initialFocus
            />
            {dateFilter && (
              <div className="p-2 border-t">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setDateFilter(null)}
                  className="w-full"
                >
                  Clear Date
                </Button>
              </div>
            )}
          </PopoverContent>
        </Popover>

        <Button onClick={onRefresh} variant="outline" size="sm" disabled={loading}>
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4 text-blue-500" />
            <span className="text-sm font-medium">Total</span>
          </div>
          <div className="text-2xl font-bold">{conversations.length}</div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-green-500" />
            <span className="text-sm font-medium">Open</span>
          </div>
          <div className="text-2xl font-bold">
            {conversations.filter(c => c.status === 'open').length}
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium">Closed</span>
          </div>
          <div className="text-2xl font-bold">
            {conversations.filter(c => c.status === 'closed').length}
          </div>
        </div>
        
        <div className="bg-card p-4 rounded-lg border">
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-orange-500" />
            <span className="text-sm font-medium">Active Agents</span>
          </div>
          <div className="text-2xl font-bold">
            {new Set(conversations.map(c => c.agent_id)).size}
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Started</TableHead>
              <TableHead>Agent</TableHead>
              <TableHead>User</TableHead>
              <TableHead>Last Intent</TableHead>
              <TableHead>Last Action</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredConversations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={8} className="h-24 text-center">
                  <div className="flex flex-col items-center gap-2">
                    <MessageSquare className="h-8 w-8 text-muted-foreground" />
                    <span className="text-muted-foreground">No conversations found</span>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              filteredConversations.map((conversation) => (
                <TableRow
                  key={conversation.id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => onConversationSelect(conversation)}
                >
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.started_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Link
                        to={`/agents/${conversation.agent_id}`}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <Bot className="h-3 w-3" />
                        {conversation.agents?.hostname || `Agent-${conversation.agent_id.slice(0, 8)}`}
                      </Link>
                      {conversation.agents && getAgentStatusBadge(conversation.agents.status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="text-sm">
                      {conversation.user_id ? (
                        <Badge variant="outline" className="text-xs">
                          {conversation.user_id.slice(0, 8)}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground">Anonymous</span>
                      )}
                    </div>
                  </TableCell>
                  <TableCell>
                    {conversation.last_intent && (
                      <Badge variant="outline" className="text-xs">
                        {conversation.last_intent.replace('_', ' ')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {conversation.last_action && (
                      <Badge variant="outline" className="text-xs">
                        {conversation.last_action.replace('_', ' ')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {conversation._count?.chat_messages || 0}
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(conversation.status)}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onConversationSelect(conversation)}>
                          View Details
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link to={`/agents/${conversation.agent_id}`}>
                            View Agent
                          </Link>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}