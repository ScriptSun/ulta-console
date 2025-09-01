import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreHorizontal, History, GitCompare, CheckCircle, AlertTriangle, Monitor } from 'lucide-react';
import { BatchVariant } from './BatchVariantSwitcher';

interface BatchVariantsListProps {
  variants: BatchVariant[];
  osTargets: string[];
  onViewHistory: (os: string) => void;
  onViewDiff: (os: string) => void;
  onActivateVersion: (os: string, version: number) => void;
  canActivate: boolean;
}

export function BatchVariantsList({
  variants,
  osTargets,
  onViewHistory,
  onViewDiff,
  onActivateVersion,
  canActivate
}: BatchVariantsListProps) {
  const getLatestVersionForOS = (os: string) => {
    const osVariants = variants.filter(v => v.os === os);
    if (osVariants.length === 0) return null;
    
    const activeVariant = osVariants.find(v => v.active);
    const latestVariant = osVariants.sort((a, b) => b.version - a.version)[0];
    
    return {
      active: activeVariant,
      latest: latestVariant,
      hasVersions: osVariants.length > 0
    };
  };

  const getStatusIcon = (status: 'active' | 'draft' | 'missing') => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-green-500" />;
      case 'draft':
        return <Monitor className="h-4 w-4 text-blue-500" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-orange-500" />;
    }
  };

  const getStatusBadge = (status: 'active' | 'draft' | 'missing', version?: number) => {
    const statusConfig = {
      // Positive statuses - use Active design from Agents table
      active: {
        variant: 'default' as const,
        className: 'bg-success/10 text-success border-success/20 hover:bg-success/20',
        dot: 'bg-success',
        icon: CheckCircle,
        text: `Active v${version}`
      },
      // Warning statuses
      draft: {
        variant: 'secondary' as const,
        className: 'bg-warning/10 text-warning border-warning/20 hover:bg-warning/20',
        dot: 'bg-warning',
        icon: Monitor,
        text: `Draft v${version}`
      },
      // Negative statuses
      missing: {
        variant: 'destructive' as const,
        className: 'bg-destructive/10 text-destructive border-destructive/20 hover:bg-destructive/20',
        dot: 'bg-destructive',
        icon: AlertTriangle,
        text: 'Missing'
      },
    };

    const config = statusConfig[status];
    const IconComponent = config.icon;
    
    return (
      <Badge variant={config.variant} className={`${config.className} gap-1.5 font-medium flex items-center`}>
        <div className={`w-2 h-2 rounded-full ${config.dot}`} />
        <IconComponent className="h-3 w-3" />
        <span>{config.text}</span>
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-sm">Compatibility Matrix</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Operating System</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Active Version</TableHead>
              <TableHead>SHA256</TableHead>
              <TableHead>Min OS Version</TableHead>
              <TableHead className="w-[100px]">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {osTargets.map(os => {
              const versionInfo = getLatestVersionForOS(os);
              
              if (!versionInfo?.hasVersions) {
                return (
                  <TableRow key={os}>
                    <TableCell className="font-medium">
                      {os.charAt(0).toUpperCase() + os.slice(1)}
                    </TableCell>
                    <TableCell>
                      {getStatusBadge('missing')}
                    </TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell className="text-muted-foreground">-</TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">No variants</span>
                    </TableCell>
                  </TableRow>
                );
              }

              const activeVariant = versionInfo.active;
              const latestVariant = versionInfo.latest;
              const isActive = !!activeVariant;
              const status = isActive ? 'active' : 'draft';

              return (
                <TableRow key={os}>
                  <TableCell className="font-medium">
                    {os.charAt(0).toUpperCase() + os.slice(1)}
                  </TableCell>
                  <TableCell>
                    {getStatusBadge(status, isActive ? activeVariant.version : latestVariant.version)}
                  </TableCell>
                  <TableCell>
                    {isActive ? (
                      <span className="font-mono text-sm">v{activeVariant.version}</span>
                    ) : (
                      <div className="flex items-center gap-2">
                        <span className="text-muted-foreground">v{latestVariant.version} (draft)</span>
                        {canActivate && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => onActivateVersion(os, latestVariant.version)}
                            className="h-6 px-2 text-xs"
                          >
                            Activate
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                  <TableCell>
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">
                      {(isActive ? activeVariant : latestVariant).sha256.substring(0, 12)}...
                    </code>
                  </TableCell>
                  <TableCell>
                    {(isActive ? activeVariant : latestVariant).min_os_version || (
                      <span className="text-muted-foreground">Any</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-6 w-6 p-0">
                          <MoreHorizontal className="h-3 w-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onViewHistory(os)}>
                          <History className="h-3 w-3 mr-2" />
                          View History
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onViewDiff(os)}>
                          <GitCompare className="h-3 w-3 mr-2" />
                          Compare Versions
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}