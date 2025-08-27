import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { DataTable } from '@/components/ui/data-table';
import { ColumnDef } from '@tanstack/react-table';
import { 
  MoreHorizontal, 
  Plus, 
  Eye, 
  Edit, 
  Power, 
  History,
  ArrowUpDown,
  Play,
  Settings,
  Trash2
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { NewBatchDrawer } from '@/components/batches/NewBatchDrawer';
import { HistorySlider } from '@/components/audit/HistorySlider';
import { useToast } from '@/hooks/use-toast';

interface AllowlistBatch {
  id: string;
  batchName: string;
  stepsCount: number;
  preflightSummary: string;
  active: boolean;
  updated: string;
  updatedBy: string;
  inputsSchema: any;
  preflight: any;
  confirmationRequired: boolean;
}

const mockBatches: AllowlistBatch[] = [
  {
    id: '1',
    batchName: 'server-maintenance',
    stepsCount: 4,
    preflightSummary: '2GB RAM, 10GB disk, ports 22,80',
    active: true,
    updated: '2024-01-15T10:30:00Z',
    updatedBy: 'admin@example.com',
    inputsSchema: {},
    preflight: {},
    confirmationRequired: true,
  },
  {
    id: '2',
    batchName: 'database-backup-restore',
    stepsCount: 3,
    preflightSummary: '4GB RAM, 50GB disk, port 5432',
    active: true,
    updated: '2024-01-12T14:20:00Z',
    updatedBy: 'dba@example.com',
    inputsSchema: {},
    preflight: {},
    confirmationRequired: false,
  },
  {
    id: '3',
    batchName: 'security-audit',
    stepsCount: 6,
    preflightSummary: '1GB RAM, 5GB disk, ports 22,443',
    active: false,
    updated: '2024-01-08T09:45:00Z',
    updatedBy: 'security@example.com',
    inputsSchema: {},
    preflight: {},
    confirmationRequired: true,
  },
];

export default function AllowlistBatches() {
  const [batches, setBatches] = useState<AllowlistBatch[]>(mockBatches);
  const [newBatchOpen, setNewBatchOpen] = useState(false);
  const [editingBatch, setEditingBatch] = useState<AllowlistBatch | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const { toast } = useToast();

  const handleToggleActive = async (batch: AllowlistBatch) => {
    try {
      // TODO: Implement API call to update batch
      setBatches(prev => prev.map(b => 
        b.id === batch.id 
          ? { ...b, active: !b.active, updated: new Date().toISOString() }
          : b
      ));

      // TODO: Add audit log entry
      toast({
        title: 'Success',
        description: `Batch ${batch.active ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update batch status',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (batch: AllowlistBatch) => {
    setEditingBatch(batch);
    setNewBatchOpen(true);
  };

  const handleHistory = (batch: AllowlistBatch) => {
    setHistoryTarget(batch.batchName);
    setHistoryOpen(true);
  };

  const handleExecute = (batch: AllowlistBatch) => {
    // TODO: Implement batch execution
    toast({
      title: 'Batch Execution',
      description: `Starting execution of ${batch.batchName}...`,
    });
  };

  const handleDelete = async (batch: AllowlistBatch) => {
    if (window.confirm(`Are you sure you want to delete "${batch.batchName}"? This action cannot be undone.`)) {
      try {
        // TODO: Implement API call to delete batch
        setBatches(prev => prev.filter(b => b.id !== batch.id));
        
        toast({
          title: 'Success',
          description: `Batch "${batch.batchName}" deleted successfully`,
        });
      } catch (error) {
        toast({
          title: 'Error',
          description: 'Failed to delete batch',
          variant: 'destructive',
        });
      }
    }
  };

  const handleCloseDrawer = () => {
    setNewBatchOpen(false);
    setEditingBatch(null);
  };

  const handleSuccess = () => {
    // Refresh batches list
    // TODO: Implement proper data fetching
  };

  const columns: ColumnDef<AllowlistBatch>[] = [
    {
      accessorKey: 'batchName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 hover:bg-transparent"
          >
            Batch
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {row.getValue('batchName')}
        </code>
      ),
    },
    {
      accessorKey: 'stepsCount',
      header: 'Steps Count',
      cell: ({ row }) => (
        <Badge variant="secondary">
          {row.getValue('stepsCount')} steps
        </Badge>
      ),
    },
    {
      accessorKey: 'preflightSummary',
      header: 'Preflight Summary',
      cell: ({ row }) => (
        <div className="max-w-[250px] truncate text-sm text-muted-foreground">
          {row.getValue('preflightSummary')}
        </div>
      ),
    },
    {
      accessorKey: 'active',
      header: 'Status',
      cell: ({ row }) => (
        <Badge variant={row.getValue('active') ? 'default' : 'secondary'}>
          {row.getValue('active') ? 'Active' : 'Inactive'}
        </Badge>
      ),
    },
    {
      accessorKey: 'confirmationRequired',
      header: 'Confirmation',
      cell: ({ row }) => (
        <Badge variant={row.getValue('confirmationRequired') ? 'outline' : 'secondary'}>
          {row.getValue('confirmationRequired') ? 'Required' : 'Auto Install'}
        </Badge>
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
        <div className="text-muted-foreground text-sm">
          {new Date(row.getValue('updated')).toLocaleDateString()}
        </div>
      ),
    },
    {
      id: 'actions',
      cell: ({ row }) => {
        const batch = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('View batch:', batch)}>
                <Eye className="mr-2 h-4 w-4" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(batch)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleExecute(batch)}>
                <Play className="mr-2 h-4 w-4" />
                Execute
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleToggleActive(batch)}>
                <Power className="mr-2 h-4 w-4" />
                {batch.active ? 'Disable' : 'Enable'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleHistory(batch)}>
                <History className="mr-2 h-4 w-4" />
                History
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                onClick={() => handleDelete(batch)}
                className="text-destructive focus:text-destructive"
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter data based on search
  const filteredBatches = batches.filter((batch) => {
    return batch.batchName.toLowerCase().includes(searchQuery.toLowerCase());
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Script Templates</h1>
          <p className="text-muted-foreground">
            Manage script templates with batch execution, confirmation settings, and activation status
          </p>
        </div>
        <Button onClick={() => setNewBatchOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Batch
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
        <div className="flex-1">
          <Input
            placeholder="Search batches by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <Settings className="h-4 w-4 mr-2" />
            Batch Settings
          </Button>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredBatches}
      />

      <NewBatchDrawer
        open={newBatchOpen}
        onOpenChange={handleCloseDrawer}
        onSuccess={handleSuccess}
        editBatch={editingBatch}
      />

      <HistorySlider
        open={historyOpen}
        onOpenChange={setHistoryOpen}
        target={historyTarget}
        title={historyTarget}
      />
    </div>
  );
}