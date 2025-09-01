import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { User, Activity, Calendar } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TopActiveAgentsProps {
  agents: Array<{
    id: string;
    name: string;
    usage: number;
    status: string;
    last_seen?: string;
    promptTokens: number;
    completionTokens: number;
  }>;
  isLoading?: boolean;
}

export function TopActiveAgents({ agents, isLoading }: TopActiveAgentsProps) {
  if (isLoading) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Top Active Agents
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/30 animate-pulse">
                <div className="space-y-2">
                  <div className="h-4 bg-muted rounded w-32"></div>
                  <div className="h-3 bg-muted rounded w-24"></div>
                </div>
                <div className="h-6 bg-muted rounded w-16"></div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!agents || agents.length === 0) {
    return (
      <Card className="bg-gradient-card border-card-border shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5 text-primary" />
            Top Active Agents
          </CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-32">
          <p className="text-muted-foreground">No active agents found</p>
        </CardContent>
      </Card>
    );
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'active':
        return 'bg-success/10 text-success border-success/20 hover:bg-success/20';
      case 'suspended':
        return 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20';
      case 'terminated':
        return 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted hover:bg-muted/70';
    }
  };

  return (
    <Card className="bg-gradient-card border-card-border shadow-card">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <User className="h-5 w-5 text-primary" />
          Top Active Agents
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {agents.slice(0, 5).map((agent, index) => (
            <div
              key={agent.id}
              className="flex items-center justify-between p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary/10 text-primary font-semibold text-sm">
                  {index + 1}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-foreground">
                      {agent.name || `Agent ${agent.id.slice(0, 8)}`}
                    </span>
                    <Badge className={getStatusColor(agent.status)} variant="outline">
                      {agent.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <Activity className="h-3 w-3" />
                      {agent.usage} requests
                    </div>
                    {agent.promptTokens + agent.completionTokens > 0 && (
                      <div className="flex items-center gap-1">
                        <span>🎯</span>
                        {(agent.promptTokens + agent.completionTokens).toLocaleString()} tokens
                      </div>
                    )}
                    {agent.last_seen && (
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(agent.last_seen), { addSuffix: true })}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-lg font-semibold text-primary">
                  {agent.usage}
                </div>
                <div className="text-xs text-muted-foreground">requests</div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}