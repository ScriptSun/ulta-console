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
      <Button>
        <Plus className="h-4 w-4 mr-2" />
        Add User
      </Button>
    </div>
  );

  const handleViewProfile = (user: User) => {
    navigate(`/users/${user.id}`);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setEditDrawerOpen(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (window.confirm(`Are you sure you want to delete user ${user.email}?`)) {
      try {
        // Add delete logic here
        toast({
          title: 'Success',
          description: 'User deleted successfully',
        });
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to delete user',
          variant: 'destructive',
        });
      }
    }
  };

  const handleUserClick = (user: User) => {
    navigate(`/users/${user.id}`);
  };

  const handleUserUpdated = () => {
    // Refresh data logic here
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="User Management"
        description="Manage users and their access to agents and features"
        actions={actions}
      />

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
        onOpenChange={setEditDrawerOpen}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
}