import { useState, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { api, type ApiResponse } from '@/lib/api';

export interface OSTarget {
  id: string;
  name: string;
  version: string;
  display_name: string;
  description?: string;
  icon_name: string;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

export interface OSOption {
  value: string; // name-version format
  label: string;
  display_name: string;
  icon_name: string;
  name: string;
  version: string;
}

export function useOSTargets() {
  const [osTargets, setOSTargets] = useState<OSTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchOSTargets = async () => {
    try {
      setLoading(true);
      
      const result = await api.query<OSTarget>('os_targets', {
        select: '*',
        filters: { is_active: true },
        orderBy: { column: 'sort_order', ascending: true }
      });

      if (!result.success) {
        throw new Error(result.error);
      }

      setOSTargets(Array.isArray(result.data) ? result.data : []);
    } catch (error) {
      console.error('Error fetching OS targets:', error);
      toast({
        title: 'Error loading OS targets',
        description: 'Failed to fetch OS targets from the database.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getOSOptions = (): OSOption[] => {
    return osTargets.map(target => ({
      value: `${target.name}-${target.version}`,
      label: target.display_name,
      display_name: target.display_name,
      icon_name: target.icon_name,
      name: target.name,
      version: target.version
    }));
  };

  const addOSTarget = async (osTarget: Omit<OSTarget, 'id' | 'created_at' | 'updated_at'>) => {
    try {
      const result = await api.insert<OSTarget>(
        'os_targets',
        { ...osTarget, is_active: true }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const newTarget = result.data;
      if (newTarget) {
        setOSTargets(prev => [...prev, newTarget].sort((a, b) => a.sort_order - b.sort_order));
        
        toast({
          title: 'OS target added',
          description: `${osTarget.display_name} has been added successfully.`,
        });
      }

      return newTarget;
    } catch (error) {
      console.error('Error adding OS target:', error);
      toast({
        title: 'Error adding OS target',
        description: 'Failed to add the OS target.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const updateOSTarget = async (id: string, updates: Partial<OSTarget>) => {
    try {
      const result = await api.update<OSTarget>(
        'os_targets',
        { id },
        updates
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      const updatedTargets = result.data;
      if (updatedTargets && updatedTargets.length > 0) {
        const updatedTarget = updatedTargets[0];
        setOSTargets(prev => 
          prev.map(target => target.id === id ? updatedTarget : target)
            .sort((a, b) => a.sort_order - b.sort_order)
        );

        toast({
          title: 'OS target updated',
          description: 'OS target has been updated successfully.',
        });

        return updatedTarget;
      }
    } catch (error) {
      console.error('Error updating OS target:', error);
      toast({
        title: 'Error updating OS target',
        description: 'Failed to update the OS target.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  const deleteOSTarget = async (id: string) => {
    try {
      const result = await api.update(
        'os_targets',
        { id },
        { is_active: false }
      );

      if (!result.success) {
        throw new Error(result.error);
      }

      setOSTargets(prev => prev.filter(target => target.id !== id));
      
      toast({
        title: 'OS target deleted',
        description: 'OS target has been deleted successfully.',
      });
    } catch (error) {
      console.error('Error deleting OS target:', error);
      toast({
        title: 'Error deleting OS target',
        description: 'Failed to delete the OS target.',
        variant: 'destructive',
      });
      throw error;
    }
  };

  useEffect(() => {
    fetchOSTargets();
  }, []);

  return {
    osTargets,
    loading,
    osOptions: getOSOptions(),
    addOSTarget,
    updateOSTarget,
    deleteOSTarget,
    refetch: fetchOSTargets
  };
}