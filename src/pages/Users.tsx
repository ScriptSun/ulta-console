import { PageHeader } from '@/components/layouts/PageHeader';
import { EnhancedUsersTable } from '@/components/users/EnhancedUsersTable';
import { Button } from '@/components/ui/button';
import { Plus, UserCheck, Server, UserX } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { UserEditDrawer } from '@/components/users/UserEditDrawer';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useToast } from '@/hooks/use-toast';

interface User {
  id: string;
  email: string;
  full_name: string | null;
  created_at: string;
  updated_at: string;
  agent_count?: number;
}

export default function Users() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [editDrawerOpen, setEditDrawerOpen] = useState(false);

  const actions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm">
        Export Users
      </Button>
      <Button onClick={() => {
        console.log('Add user clicked');
        toast({
          title: 'Coming Soon',
          description: 'User creation functionality will be available soon',
        });
      }}>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  );

  const handleViewProfile = (user: User) => {
    console.log('Viewing profile for user:', user);
    toast({
      title: 'Navigating to Profile',
      description: `Opening profile for ${user.full_name || user.email}`,
    });
    navigate(`/users/${user.id}`);
  };

  const handleEditUser = (user: User) => {
    console.log('Editing user:', user);
    console.log('Setting editDrawerOpen to true');
    toast({
      title: 'Opening Edit Panel',
      description: `Editing ${user.full_name || user.email}`,
    });
    setSelectedUser(user);
    setEditDrawerOpen(true);
    console.log('Edit drawer state should now be:', true);
  };

  const handleDeleteUser = async (user: User) => {
    console.log('Attempting to delete user:', user);
    if (window.confirm(`Are you sure you want to delete user ${user.email}? This action cannot be undone.`)) {
      try {
        console.log('User confirmed deletion for:', user.email);
        // TODO: Implement actual delete logic with Supabase
        toast({
          title: 'Success',
          description: `User ${user.email} deleted successfully`,
        });
      } catch (error: any) {
        console.error('Delete error:', error);
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUserClick = (user: User) => {
    console.log('User row clicked:', user);
    toast({
      title: 'Opening User Details',
      description: `Loading details for ${user.full_name || user.email}`,
    });
    navigate(`/users/${user.id}`);
  };

  const handleUserUpdated = () => {
    console.log('User updated, refreshing data');
    toast({
      title: 'User Updated',
      description: 'User information has been updated successfully',
    });
    // TODO: Add logic to refresh the users table data
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage users and their access to agents and features"
        actions={actions}
      />

      {/* Debug section - temporary */}
      <div className="p-4 bg-yellow-100 border border-yellow-300 rounded">
        <p>Debug: editDrawerOpen = {String(editDrawerOpen)}</p>
        <p>Debug: selectedUser = {selectedUser?.email || 'none'}</p>
        <Button 
          onClick={() => {
            console.log('Force opening drawer');
            setSelectedUser({ id: 'test', email: 'test@example.com', full_name: 'Test User', created_at: new Date().toISOString(), updated_at: new Date().toISOString() });
            setEditDrawerOpen(true);
          }}
          className="mt-2"
        >
          Force Open Drawer (Test)
        </Button>
      </div>

      {/* Statistics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="border-primary/20" style={{ background: 'var(--gradient-primary)' }}>
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">Total Users</p>
                <p className="text-3xl font-bold text-primary-foreground">6</p>
              </div>
              <UserCheck className="h-8 w-8 text-primary-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary border-secondary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-foreground/80">Users with Agents</p>
                <p className="text-3xl font-bold text-secondary-foreground">5</p>
              </div>
              <UserCheck className="h-8 w-8 text-secondary-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-accent border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent-foreground/80">Total Agents</p>
                <p className="text-3xl font-bold text-accent-foreground">48</p>
              </div>
              <Server className="h-8 w-8 text-accent-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-muted border-muted/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground/80">Users without Agents</p>
                <p className="text-3xl font-bold text-foreground">1</p>
              </div>
              <UserX className="h-8 w-8 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>
      </div>

      <EnhancedUsersTable
        onUserClick={handleUserClick}
        onUserEdit={handleEditUser}
        onUserDelete={handleDeleteUser}
        onViewProfile={handleViewProfile}
      />

      {/* User Edit Drawer */}
      <UserEditDrawer
        user={selectedUser}
        open={editDrawerOpen}
        onOpenChange={(open) => {
          console.log('UserEditDrawer onOpenChange called with:', open);
          setEditDrawerOpen(open);
        }}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}