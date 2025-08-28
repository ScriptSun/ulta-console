import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  MoreVertical
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

  const filteredConversations = conversations.filter(conversation => {
    const matchesSearch = searchQuery === "" || 
      conversation.agents?.hostname?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.session_id?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      conversation.last_intent?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === null || conversation.status === statusFilter;
    
    return matchesSearch && matchesStatus;
  });

  const getStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      open: "default",
      closed: "secondary",
    };
    
    return (
      <Badge variant={variants[status] || "outline"}>
        {status}
      </Badge>
    );
  };

  const getAgentStatusBadge = (status: string) => {
    const variants: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
      online: "default",
      offline: "secondary",
    };
    
    return (
      <Badge variant={variants[status] || "outline"} className="text-xs">
        {status}
      </Badge>
    );
  };

  const getSourceBadge = (source: string) => {
    const colors: Record<string, string> = {
      website: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
      billing: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
      whmcs: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
    };
    
    return (
      <Badge className={colors[source] || "bg-gray-100 text-gray-800"}>
        {source}
      </Badge>
    );
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className="animate-pulse">
          <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="h-12 bg-gray-200 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filters and Search */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-sm">
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
            <User className="h-4 w-4 text-purple-500" />
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
              <TableHead>Agent</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Messages</TableHead>
              <TableHead>Last Intent</TableHead>
              <TableHead>Started</TableHead>
              <TableHead>Updated</TableHead>
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
                  <TableCell>
                    <div className="flex items-center gap-2">
                        <Link
                          to={`/agents`}
                          className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-primary/10 text-primary text-xs hover:bg-primary/20 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                        <Bot className="h-3 w-3" />
                        {conversation.agents?.hostname || `Agent-${conversation.agent_id.slice(0, 8)}`}
                      </Link>
                      {conversation.agents && getAgentStatusBadge(conversation.agents.status)}
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(conversation.status)}</TableCell>
                  <TableCell>{getSourceBadge(conversation.source)}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-xs">
                        {conversation._count?.chat_messages || 0} msgs
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {conversation._count?.chat_events || 0} events
                      </Badge>
                    </div>
                  </TableCell>
                  <TableCell>
                    {conversation.last_intent && (
                      <Badge variant="outline" className="text-xs">
                        {conversation.last_intent.replace('_', ' ')}
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.started_at), { addSuffix: true })}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {formatDistanceToNow(new Date(conversation.updated_at), { addSuffix: true })}
                  </TableCell>
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
                          <Link to={`/agents`}>
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