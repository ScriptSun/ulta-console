import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { 
  ArrowLeft, 
  Download, 
  PlayCircle, 
  GitBranch, 
  Shield,
  MoreHorizontal,
  Diff,
  CheckCircle
} from 'lucide-react';
import { SHABadge } from '@/components/scripts/SHABadge';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';

interface ScriptVersion {
  id: string;
  version: number;
  sha256: string;
  sizeBytes: number;
  created: string;
  status: 'draft' | 'published' | 'deprecated';
  createdBy: string;
}

interface Script {
  id: string;
  name: string;
  description?: string;
  created: string;
  updated: string;
  customerid: string;
}

const versionColumns: ColumnDef<ScriptVersion>[] = [
  {
    accessorKey: 'version',
    header: 'Version',
    cell: ({ row }) => (
      <Badge variant="outline">v{row.getValue('version')}</Badge>
    ),
  },
  {
    accessorKey: 'sha256',
    header: 'SHA256',
    cell: ({ row }) => (
      <SHABadge sha256={row.getValue('sha256')} />
    ),
  },
  {
    accessorKey: 'sizeBytes',
    header: 'Size',
    cell: ({ row }) => {
      const bytes = row.getValue('sizeBytes') as number;
      return <span className="text-muted-foreground">{(bytes / 1024).toFixed(1)} KB</span>;
    },
  },
  {
    accessorKey: 'created',
    header: 'Created',
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {new Date(row.getValue('created')).toLocaleDateString()}
      </div>
    ),
  },
  {
    accessorKey: 'status',
    header: 'Status',
    cell: ({ row }) => {
      const status = row.getValue('status') as string;
      const variant = status === 'published' ? 'default' : 
                     status === 'draft' ? 'secondary' : 'outline';
      return <Badge variant={variant}>{status}</Badge>;
    },
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const version = row.original;
      const [diffOpen, setDiffOpen] = useState(false);

      return (
        <>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {version.status !== 'published' && (
                <DropdownMenuItem>
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Activate
                </DropdownMenuItem>
              )}
              <DropdownMenuItem onClick={() => setDiffOpen(true)}>
                <Diff className="mr-2 h-4 w-4" />
                Diff
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Download className="mr-2 h-4 w-4" />
                Download
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Sheet open={diffOpen} onOpenChange={setDiffOpen}>
            <SheetContent className="w-[800px] sm:w-[800px] max-w-none">
              <SheetHeader>
                <SheetTitle>Version Diff - v{version.version}</SheetTitle>
                <SheetDescription>
                  Compare with previous version
                </SheetDescription>
              </SheetHeader>
              <div className="mt-6">
                <div className="bg-muted p-4 rounded-lg font-mono text-sm">
                  <div className="text-green-500">+ Added lines will appear in green</div>
                  <div className="text-red-500">- Removed lines will appear in red</div>
                  <div className="text-muted-foreground mt-4">
                    // TODO: Implement actual diff viewer
                  </div>
                </div>
              </div>
            </SheetContent>
          </Sheet>
        </>
      );
    },
  },
];

export default function ScriptDetail() {
  const { id } = useParams<{ id: string }>();
  const [script, setScript] = useState<Script | null>(null);
  const [versions, setVersions] = useState<ScriptVersion[]>([]);
  const [source, setSource] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // TODO: Fetch script and versions from API
    setScript({
      id: id || '',
      name: 'System Update Script',
      description: 'Automated system update and maintenance script for Ubuntu/Debian servers',
      created: '2024-01-01T10:00:00Z',
      updated: '2024-01-15T10:30:00Z',
      customerid: 'customer-1',
    });

    setVersions([
      {
        id: 'v1',
        version: 1,
        sha256: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
        sizeBytes: 2048,
        created: '2024-01-01T10:00:00Z',
        status: 'deprecated',
        createdBy: 'user@example.com',
      },
      {
        id: 'v2',
        version: 2,
        sha256: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1',
        sizeBytes: 2156,
        created: '2024-01-10T14:00:00Z',
        status: 'deprecated',
        createdBy: 'user@example.com',
      },
      {
        id: 'v3',
        version: 3,
        sha256: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2',
        sizeBytes: 2203,
        created: '2024-01-15T10:30:00Z',
        status: 'published',
        createdBy: 'user@example.com',
      },
    ]);

    setSource(`#!/bin/bash

# System Update Script
# Description: Automated system update and maintenance script
# Version: 3.0

set -euo pipefail

echo "Starting system update process..."

# Update package lists
apt-get update

# Upgrade packages
apt-get upgrade -y

# Clean up
apt-get autoremove -y
apt-get autoclean

echo "System update completed successfully"
`);

    setLoading(false);
  }, [id]);

  if (loading) {
    return <div>Loading...</div>;
  }

  if (!script) {
    return <div>Script not found</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="sm" asChild>
          <Link to="/scripts/templates">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Scripts
          </Link>
        </Button>
      </div>

      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold">{script.name}</h1>
          {script.description && (
            <p className="text-muted-foreground mt-2">{script.description}</p>
          )}
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <GitBranch className="mr-2 h-4 w-4" />
            New Version
          </Button>
          <Button>
            <PlayCircle className="mr-2 h-4 w-4" />
            Execute
          </Button>
        </div>
      </div>

      <Tabs defaultValue="versions" className="space-y-4">
        <TabsList>
          <TabsTrigger value="versions">Versions</TabsTrigger>
          <TabsTrigger value="source">Source</TabsTrigger>
          <TabsTrigger value="metadata">Metadata</TabsTrigger>
          <TabsTrigger value="security">Security</TabsTrigger>
        </TabsList>

        <TabsContent value="versions" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Version History</CardTitle>
            </CardHeader>
            <CardContent>
              <DataTable
                columns={versionColumns}
                data={versions}
                searchKey="version"
                searchPlaceholder="Search versions..."
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="source" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Latest Source Code</CardTitle>
            </CardHeader>
            <CardContent>
              <pre className="bg-muted p-4 rounded-lg overflow-x-auto text-sm">
                <code>{source}</code>
              </pre>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="metadata" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Basic Information</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Script ID:</span>
                  <span className="ml-2 font-mono text-sm">{script.id}</span>
                </div>
                <div>
                  <span className="font-medium">Created:</span>
                  <span className="ml-2">{new Date(script.created).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Last Updated:</span>
                  <span className="ml-2">{new Date(script.updated).toLocaleString()}</span>
                </div>
                <div>
                  <span className="font-medium">Total Versions:</span>
                  <span className="ml-2">{versions.length}</span>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Usage Statistics</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <div>
                  <span className="font-medium">Executions:</span>
                  <span className="ml-2">42</span>
                </div>
                <div>
                  <span className="font-medium">Success Rate:</span>
                  <span className="ml-2">98.5%</span>
                </div>
                <div>
                  <span className="font-medium">Avg Duration:</span>
                  <span className="ml-2">2m 34s</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <h4 className="font-medium mb-2">Risk Level</h4>
                <Badge variant="secondary">Medium</Badge>
              </div>
              <div>
                <h4 className="font-medium mb-2">Required Permissions</h4>
                <ul className="list-disc list-inside text-sm text-muted-foreground space-y-1">
                  <li>Package management (apt)</li>
                  <li>File system access</li>
                  <li>Network access for updates</li>
                </ul>
              </div>
              <div>
                <h4 className="font-medium mb-2">Security Scan Results</h4>
                <div className="text-sm text-muted-foreground">
                  Last scanned: {new Date().toLocaleDateString()}
                  <br />
                  No security issues detected
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}