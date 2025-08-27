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
  Filter
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { NewCommandDrawer } from '@/components/commands/NewCommandDrawer';
import { SHABadge } from '@/components/scripts/SHABadge';
import { HistorySlider } from '@/components/audit/HistorySlider';
import { useToast } from '@/hooks/use-toast';

interface AllowlistCommand {
  id: string;
  commandName: string;
  scriptName: string;
  scriptVersion: number;
  expectedSHA: string;
  osWhitelist: string[];
  minAgentVersion?: string;
  timeoutSec: number;
  risk: 'low' | 'medium' | 'high';
  active: boolean;
  updated: string;
  updatedBy: string;
}

const mockCommands: AllowlistCommand[] = [
  {
    id: '1',
    commandName: 'system-update',
    scriptName: 'System Update Script',
    scriptVersion: 3,
    expectedSHA: 'a1b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456',
    osWhitelist: ['ubuntu', 'debian'],
    minAgentVersion: '1.2.0',
    timeoutSec: 600,
    risk: 'medium',
    active: true,
    updated: '2024-01-15T10:30:00Z',
    updatedBy: 'user@example.com',
  },
  {
    id: '2',
    commandName: 'db-backup',
    scriptName: 'Database Backup',
    scriptVersion: 2,
    expectedSHA: 'b2c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1',
    osWhitelist: ['linux', 'ubuntu', 'centos'],
    timeoutSec: 1800,
    risk: 'high',
    active: true,
    updated: '2024-01-10T14:45:00Z',
    updatedBy: 'admin@example.com',
  },
  {
    id: '3',
    commandName: 'log-rotate',
    scriptName: 'Log Rotation',
    scriptVersion: 1,
    expectedSHA: 'c3d4e5f6789012345678901234567890abcdef1234567890abcdef123456a1b2',
    osWhitelist: ['windows'],
    minAgentVersion: '1.1.0',
    timeoutSec: 300,
    risk: 'low',
    active: false,
    updated: '2024-01-05T09:15:00Z',
    updatedBy: 'user@example.com',
  },
];

export default function AllowlistCommands() {
  const [commands, setCommands] = useState<AllowlistCommand[]>(mockCommands);
  const [newCommandOpen, setNewCommandOpen] = useState(false);
  const [editingCommand, setEditingCommand] = useState<AllowlistCommand | null>(null);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyTarget, setHistoryTarget] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string>('all');
  const [osFilter, setOsFilter] = useState<string>('all');
  const [riskFilter, setRiskFilter] = useState<string>('all');
  const { toast } = useToast();

  const handleToggleActive = async (command: AllowlistCommand) => {
    try {
      // TODO: Implement API call to update command
      setCommands(prev => prev.map(cmd => 
        cmd.id === command.id 
          ? { ...cmd, active: !cmd.active, updated: new Date().toISOString() }
          : cmd
      ));

      // TODO: Add audit log entry
      toast({
        title: 'Success',
        description: `Command ${command.active ? 'deactivated' : 'activated'} successfully`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to update command status',
        variant: 'destructive',
      });
    }
  };

  const handleEdit = (command: AllowlistCommand) => {
    setEditingCommand(command);
    setNewCommandOpen(true);
  };

  const handleHistory = (command: AllowlistCommand) => {
    setHistoryTarget(command.commandName);
    setHistoryOpen(true);
  };

  const handleCloseDrawer = () => {
    setNewCommandOpen(false);
    setEditingCommand(null);
  };

  const handleSuccess = () => {
    // Refresh commands list
    // TODO: Implement proper data fetching
  };

  const getRiskBadgeVariant = (risk: string) => {
    switch (risk) {
      case 'low': return 'secondary';
      case 'medium': return 'outline';
      case 'high': return 'destructive';
      default: return 'outline';
    }
  };

  const columns: ColumnDef<AllowlistCommand>[] = [
    {
      accessorKey: 'commandName',
      header: ({ column }) => {
        return (
          <Button
            variant="ghost"
            onClick={() => column.toggleSorting(column.getIsSorted() === 'asc')}
            className="h-auto p-0 hover:bg-transparent"
          >
            Command
            <ArrowUpDown className="ml-2 h-4 w-4" />
          </Button>
        );
      },
      cell: ({ row }) => (
        <code className="font-mono text-sm bg-muted px-2 py-1 rounded">
          {row.getValue('commandName')}
        </code>
      ),
    },
    {
      accessorKey: 'scriptName',
      header: 'Script & Version',
      cell: ({ row }) => (
        <div className="space-y-1">
          <div className="font-medium">{row.original.scriptName}</div>
          <Badge variant="outline" className="text-xs">
            v{row.original.scriptVersion}
          </Badge>
        </div>
      ),
    },
    {
      accessorKey: 'expectedSHA',
      header: 'Expected SHA',
      cell: ({ row }) => (
        <SHABadge sha256={row.getValue('expectedSHA')} />
      ),
    },
    {
      accessorKey: 'osWhitelist',
      header: 'OS Whitelist',
      cell: ({ row }) => {
        const osList = row.getValue('osWhitelist') as string[];
        return (
          <div className="flex flex-wrap gap-1">
            {osList.slice(0, 2).map((os) => (
              <Badge key={os} variant="secondary" className="text-xs">
                {os}
              </Badge>
            ))}
            {osList.length > 2 && (
              <Badge variant="outline" className="text-xs">
                +{osList.length - 2}
              </Badge>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'minAgentVersion',
      header: 'Min Agent',
      cell: ({ row }) => {
        const version = row.getValue('minAgentVersion') as string;
        return version ? (
          <code className="text-xs">{version}</code>
        ) : (
          <span className="text-muted-foreground text-xs">Any</span>
        );
      },
    },
    {
      accessorKey: 'timeoutSec',
      header: 'Timeout',
      cell: ({ row }) => (
        <span className="text-sm">{row.getValue('timeoutSec')}s</span>
      ),
    },
    {
      accessorKey: 'risk',
      header: 'Risk',
      cell: ({ row }) => {
        const risk = row.getValue('risk') as string;
        return (
          <Badge variant={getRiskBadgeVariant(risk)}>
            {risk.charAt(0).toUpperCase() + risk.slice(1)}
          </Badge>
        );
      },
    },
    {
      accessorKey: 'active',
      header: 'Active',
      cell: ({ row }) => (
        <Badge variant={row.getValue('active') ? 'default' : 'secondary'}>
          {row.getValue('active') ? 'Active' : 'Inactive'}
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
        const command = row.original;

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => console.log('View command:', command)}>
                <Eye className="mr-2 h-4 w-4" />
                View
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleEdit(command)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleToggleActive(command)}>
                <Power className="mr-2 h-4 w-4" />
                {command.active ? 'Disable' : 'Enable'}
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => handleHistory(command)}>
                <History className="mr-2 h-4 w-4" />
                History
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        );
      },
    },
  ];

  // Filter data based on search and filters
  const filteredCommands = commands.filter((command) => {
    const matchesSearch = 
      command.commandName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      command.scriptName.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesActive = 
      activeFilter === 'all' || 
      (activeFilter === 'active' && command.active) ||
      (activeFilter === 'inactive' && !command.active);
    
    const matchesOS = 
      osFilter === 'all' || 
      command.osWhitelist.includes(osFilter);
    
    const matchesRisk = 
      riskFilter === 'all' || 
      command.risk === riskFilter;

    return matchesSearch && matchesActive && matchesOS && matchesRisk;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Allowlist Commands</h1>
          <p className="text-muted-foreground">
            Manage approved commands and their configurations
          </p>
        </div>
        <Button onClick={() => setNewCommandOpen(true)}>
          <Plus className="mr-2 h-4 w-4" />
          New Command
        </Button>
      </div>

      {/* Toolbar */}
      <div className="flex items-center gap-4 p-4 border rounded-lg bg-card">
        <div className="flex-1">
          <Input
            placeholder="Search by command or script name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="max-w-sm"
          />
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4 text-muted-foreground" />
          
          <Select value={activeFilter} onValueChange={setActiveFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>

          <Select value={osFilter} onValueChange={setOsFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="OS" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All OS</SelectItem>
              <SelectItem value="windows">Windows</SelectItem>
              <SelectItem value="linux">Linux</SelectItem>
              <SelectItem value="ubuntu">Ubuntu</SelectItem>
              <SelectItem value="debian">Debian</SelectItem>
              <SelectItem value="centos">CentOS</SelectItem>
            </SelectContent>
          </Select>

          <Select value={riskFilter} onValueChange={setRiskFilter}>
            <SelectTrigger className="w-[120px]">
              <SelectValue placeholder="Risk" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Risk</SelectItem>
              <SelectItem value="low">Low</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="high">High</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={filteredCommands}
      />

      <NewCommandDrawer
        open={newCommandOpen}
        onOpenChange={handleCloseDrawer}
        onSuccess={handleSuccess}
        editCommand={editingCommand}
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