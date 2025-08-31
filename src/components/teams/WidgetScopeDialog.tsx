import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Shield, Eye, Edit, Trash2, RotateCcw, Layout, CheckSquare, Square } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';

interface WidgetScopeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  member: any;
  currentUserRole: string;
}

export function WidgetScopeDialog({ open, onOpenChange, member, currentUserRole }: WidgetScopeDialogProps) {
  const { toast } = useToast();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [selectedWidgets, setSelectedWidgets] = useState<Set<string>>(new Set());

  const canEdit = ['Owner', 'Admin'].includes(currentUserRole);

  // Fetch all widgets
  const { data: widgets } = useQuery({
    queryKey: ['widgets'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('widgets')
        .select('*')
        .order('name');
      
      if (error) throw error;
      return data;
    }
  });

  // Fetch current widget scopes for the member
  const { data: currentScopes, isLoading } = useQuery({
    queryKey: ['console-member-widget-scopes', member?.id],
    queryFn: async () => {
      if (!member?.id) return [];
      
      const { data, error } = await supabase
        .from('console_member_widget_scopes')
        .select('widget_id')
        .eq('member_id', member.id);
      
      if (error) throw error;
      return data;
    },
    enabled: !!member?.id && open
  });

  // Initialize selected widgets when data loads
  useEffect(() => {
    if (currentScopes) {
      const scopedWidgetIds = new Set(currentScopes.map(scope => scope.widget_id));
      setSelectedWidgets(scopedWidgetIds);
    }
  }, [currentScopes]);

  // Save widget scopes mutation
  const saveWidgetScopesMutation = useMutation({
    mutationFn: async () => {
      if (!member?.id) throw new Error('No member selected');

      // First, delete all existing scopes for this member
      const { error: deleteError } = await supabase
        .from('console_member_widget_scopes')
        .delete()
        .eq('member_id', member.id);

      if (deleteError) throw deleteError;

      // Then, insert new scopes if any widgets are selected
      if (selectedWidgets.size > 0) {
        const scopes = Array.from(selectedWidgets).map(widgetId => ({
          member_id: member.id,
          widget_id: widgetId
        }));

        const { error: insertError } = await supabase
          .from('console_member_widget_scopes')
          .insert(scopes);

        if (insertError) throw insertError;
      }
    },
    onSuccess: () => {
      toast({
        title: "Widget scopes updated",
        description: `Widget access has been ${selectedWidgets.size === 0 ? 'reset to team defaults' : 'limited to selected widgets'}.`,
      });
      queryClient.invalidateQueries({ queryKey: ['console-member-widget-scopes'] });
      onOpenChange(false);
    },
    onError: (error: any) => {
      toast({
        title: "Failed to update widget scopes",
        description: error.message || "There was an error updating widget scopes.",
        variant: "destructive",
      });
    }
  });

  const toggleWidget = (widgetId: string) => {
    if (!canEdit) return;
    
    setSelectedWidgets(prev => {
      const newSet = new Set(prev);
      if (newSet.has(widgetId)) {
        newSet.delete(widgetId);
      } else {
        newSet.add(widgetId);
      }
      return newSet;
    });
  };

  const selectAll = () => {
    if (!canEdit || !widgets) return;
    setSelectedWidgets(new Set(widgets.map(w => w.id)));
  };

  const selectNone = () => {
    if (!canEdit) return;
    setSelectedWidgets(new Set());
  };

  const handleSave = () => {
    saveWidgetScopesMutation.mutate();
  };

  if (isLoading) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="sm:max-w-2xl">
          <div className="flex items-center justify-center p-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Layout className="h-5 w-5" />
            Widget Access Scope
          </DialogTitle>
          <DialogDescription>
            Configure which widgets{' '}
            <span className="font-medium">{member?.admin_profiles?.full_name || member?.admin_profiles?.email}</span>
            {' '}can access. If no widgets are selected, they inherit team defaults (all widgets).
            {!canEdit && ' (View Only)'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {selectedWidgets.size === 0 ? 'Team Defaults' : `${selectedWidgets.size} Widget${selectedWidgets.size !== 1 ? 's' : ''} Selected`}
              </Badge>
              {currentScopes && currentScopes.length === 0 && (
                <span className="text-sm text-muted-foreground">
                  Currently has access to all team widgets
                </span>
              )}
            </div>
            {canEdit && (
              <div className="flex gap-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectAll}
                  className="gap-1"
                >
                  <CheckSquare className="h-3 w-3" />
                  Select All
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={selectNone}
                  className="gap-1"
                >
                  <Square className="h-3 w-3" />
                  Select None
                </Button>
              </div>
            )}
          </div>

          <div className="space-y-2 max-h-80 overflow-y-auto">
            {widgets?.map((widget) => (
              <div key={widget.id} className="flex items-center justify-between p-3 border border-border rounded-lg bg-card/30">
                <div className="flex items-center space-x-3">
                  <Checkbox 
                    id={widget.id}
                    checked={selectedWidgets.has(widget.id)}
                    disabled={!canEdit}
                    onCheckedChange={() => toggleWidget(widget.id)}
                  />
                  <label htmlFor={widget.id} className="flex-1 cursor-pointer">
                    <div>
                      <h4 className="font-medium">{widget.name}</h4>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge variant="secondary" className="text-xs">
                          ID: {widget.id}
                        </Badge>
                        <Badge variant="secondary" className="text-xs">
                          Customer: {widget.customer_id}
                        </Badge>
                      </div>
                    </div>
                  </label>
                </div>
              </div>
            ))}
            
            {!widgets?.length && (
              <div className="text-center py-6 text-muted-foreground">
                No widgets found
              </div>
            )}
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? 'Cancel' : 'Close'}
          </Button>
          {canEdit && (
            <Button 
              onClick={handleSave} 
              disabled={saveWidgetScopesMutation.isPending}
            >
              {saveWidgetScopesMutation.isPending ? "Saving..." : "Save Changes"}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}