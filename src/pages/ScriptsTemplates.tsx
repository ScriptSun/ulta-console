import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';
import { Input } from '@/components/ui/input';
import { ColumnDef } from '@tanstack/react-table';
import { MoreHorizontal, Eye, Plus, Upload, ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NewScriptDialog } from '@/components/scripts/NewScriptDialog';
import { UploadScriptDialog } from '@/components/scripts/UploadScriptDialog';
import { SHABadge } from '@/components/scripts/SHABadge';
import { Badge } from '@/components/ui/badge';

// Script data structure
interface Script {
  id: string;
  name: string;
  latestVersion: number;
  latestSHA: string;
  updated: string;
  status: 'draft' | 'published';
}

const columns: ColumnDef<Script>[] = [
  {
    accessorKey: 'name',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent"
        >
          Script Name
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <Link
        to={`/scripts/templates/${row.original.id}`}
        className="font-medium hover:text-primary transition-smooth"
      >
        {row.getValue('name')}
      </Link>
    ),
  },
  {
    accessorKey: 'latestVersion',
    header: 'Latest Version',
    cell: ({ row }) => (
      <Badge variant="outline">v{row.getValue('latestVersion')}</Badge>
    ),
  },
  {
    accessorKey: 'latestSHA',
    header: 'Latest SHA',
    cell: ({ row }) => (
      <SHABadge sha256={row.getValue('latestSHA')} />
    ),
  },
  {
    accessorKey: 'updated',
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          className="h-auto p-0 hover:bg-transparent"
        >
          Updated
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => (
      <div className="text-muted-foreground">
        {new Date(row.getValue('updated')).toLocaleDateString()}
      </div>
    ),
  },
  {
    id: 'actions',
    cell: ({ row }) => {
      const script = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem asChild>
              <Link to={`/scripts/templates/${script.id}`}>
                <Eye className="mr-2 h-4 w-4" />
                Open Script Detail
              </Link>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];

export default function ScriptsTemplates() {
  const [scripts, setScripts] = useState<Script[]>([
    {
      id: '1',
      name: 'System Update Script',
      latestVersion: 3,
      latestSHA: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
      updated: '2024-01-15T10:30:00Z',
      status: 'published',
    },
    {
      id: '2',
      name: 'Database Backup',
      latestVersion: 2,
      latestSHA: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1',
      updated: '2024-01-10T14:45:00Z',
      status: 'published',
    },
    {
      id: '3',
      name: 'Log Rotation',
      latestVersion: 1,
      latestSHA: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2',
      updated: '2024-01-05T09:15:00Z',
      status: 'draft',
    },
  ]);

  const [newScriptOpen, setNewScriptOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);

  const handleScriptCreated = () => {
    // Refresh scripts list
    // TODO: Implement proper data fetching
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Script Templates</h1>
          <p className="text-muted-foreground">
            Manage and organize your script templates
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setUploadOpen(true)}>
            <Upload className="mr-2 h-4 w-4" />
            Upload
          </Button>
          <Button onClick={() => setNewScriptOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Script
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={scripts}
        searchKey="name"
        searchPlaceholder="Search scripts..."
      />

      <NewScriptDialog
        open={newScriptOpen}
        onOpenChange={setNewScriptOpen}
        onSuccess={handleScriptCreated}
      />

      <UploadScriptDialog
        open={uploadOpen}
        onOpenChange={setUploadOpen}
        onSuccess={handleScriptCreated}
      />
    </div>
  );
}