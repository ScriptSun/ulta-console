import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useOSTargets, OSTarget } from '@/hooks/useOSTargets';
import { 
  Plus, 
  Edit3, 
  Trash2, 
  Monitor, 
  Server, 
  HardDrive, 
  Cpu,
  Loader2,
  Settings
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface OSTargetsManagerProps {
  open: boolean;
  onClose: () => void;
}

const iconOptions = [
  { value: 'Monitor', label: 'Monitor', icon: Monitor },
  { value: 'Server', label: 'Server', icon: Server },
  { value: 'HardDrive', label: 'Hard Drive', icon: HardDrive },
  { value: 'Cpu', label: 'CPU', icon: Cpu },
];

export function OSTargetsManager({ open, onClose }: OSTargetsManagerProps) {
  const { osTargets, loading, addOSTarget, updateOSTarget, deleteOSTarget } = useOSTargets();
  const [editingTarget, setEditingTarget] = useState<OSTarget | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    version: '',
    display_name: '',
    description: '',
    icon_name: 'Monitor',
    sort_order: osTargets.length + 1,
  });

  const resetForm = () => {
    setFormData({
      name: '',
      version: '',
      display_name: '',
      description: '',
      icon_name: 'Monitor',
      sort_order: osTargets.length + 1,
    });
  };

  const handleAdd = () => {
    setEditingTarget(null);
    resetForm();
    setShowAddDialog(true);
  };

  const handleEdit = (target: OSTarget) => {
    setEditingTarget(target);
    setFormData({
      name: target.name,
      version: target.version,
      display_name: target.display_name,
      description: target.description || '',
      icon_name: target.icon_name,
      sort_order: target.sort_order,
    });
    setShowAddDialog(true);
  };

  const handleSubmit = async () => {
    try {
      console.log('Submitting form data:', formData);
      console.log('Editing target:', editingTarget);
      
      if (editingTarget) {
        console.log('Updating target with ID:', editingTarget.id);
        const result = await updateOSTarget(editingTarget.id, formData);
        console.log('Update result:', result);
      } else {
        console.log('Adding new target');
        await addOSTarget({
          ...formData,
          is_active: true,
        });
      }
      setShowAddDialog(false);
      resetForm();
    } catch (error) {
      console.error('Submit error:', error);
      // Error handled in hook
    }
  };

  const handleDelete = async (target: OSTarget) => {
    if (confirm(`Are you sure you want to delete ${target.display_name}?`)) {
      await deleteOSTarget(target.id);
    }
  };

  const getIcon = (iconName: string) => {
    const iconOption = iconOptions.find(opt => opt.value === iconName);
    return iconOption?.icon || Monitor;
  };

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent className="max-w-4xl max-h-[90vh]">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Settings className="h-5 w-5" />
                <DialogTitle>Configure OS Targets</DialogTitle>
              </div>
              <Button onClick={handleAdd} size="sm">
                <Plus className="h-4 w-4 mr-2" />
                Add OS Target
              </Button>
            </div>
            <DialogDescription>
              Manage operating system targets available for batch scripts
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-6">

            {loading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin" />
              </div>
            ) : (
              <div className="border rounded-lg">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>OS</TableHead>
                      <TableHead>Version</TableHead>
                      <TableHead>Display Name</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {osTargets.map((target) => {
                      const IconComponent = getIcon(target.icon_name);
                      return (
                        <TableRow key={target.id}>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <IconComponent className="h-4 w-4" />
                              {target.name}
                            </div>
                          </TableCell>
                          <TableCell>{target.version}</TableCell>
                          <TableCell>{target.display_name}</TableCell>
                          <TableCell>{target.description}</TableCell>
                          <TableCell>
                            <Badge variant={target.is_active ? 'default' : 'secondary'}>
                              {target.is_active ? 'Active' : 'Inactive'}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleEdit(target)}
                              >
                                <Edit3 className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(target)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Add/Edit Dialog */}
      <Dialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTarget ? 'Edit OS Target' : 'Add OS Target'}
            </DialogTitle>
            <DialogDescription>
              {editingTarget 
                ? 'Update the OS target configuration' 
                : 'Add a new operating system target for batch scripts'
              }
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">OS Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. ubuntu, debian, windows"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="version">Version</Label>
              <Input
                id="version"
                value={formData.version}
                onChange={(e) => setFormData({ ...formData, version: e.target.value })}
                placeholder="e.g. 22.04, 12, server-2022"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="display_name">Display Name</Label>
              <Input
                id="display_name"
                value={formData.display_name}
                onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
                placeholder="e.g. Ubuntu 22.04 LTS"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Optional description of this OS target"
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="icon">Icon</Label>
              <Select
                value={formData.icon_name}
                onValueChange={(value) => setFormData({ ...formData, icon_name: value })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {iconOptions.map((option) => {
                    const IconComponent = option.icon;
                    return (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex items-center gap-2">
                          <IconComponent className="h-4 w-4" />
                          {option.label}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="sort_order">Sort Order</Label>
              <Input
                id="sort_order"
                type="number"
                value={formData.sort_order}
                onChange={(e) => setFormData({ ...formData, sort_order: parseInt(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setShowAddDialog(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit}>
              {editingTarget ? 'Update' : 'Add'} OS Target
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}