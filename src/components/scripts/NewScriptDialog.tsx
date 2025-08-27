import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { computeSHA256 } from '@/utils/sha256';
import { SHABadge } from './SHABadge';

interface NewScriptDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

export function NewScriptDialog({ open, onOpenChange, onSuccess }: NewScriptDialogProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [source, setSource] = useState('');
  const [sha256, setSha256] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSourceChange = async (value: string) => {
    setSource(value);
    if (value.trim()) {
      try {
        const hash = await computeSHA256(value);
        setSha256(hash);
      } catch (error) {
        console.error('Failed to compute SHA256:', error);
        setSha256('');
      }
    } else {
      setSha256('');
    }
  };

  const handleSubmit = async () => {
    if (!name.trim() || !source.trim()) {
      toast({
        title: 'Validation Error',
        description: 'Name and source code are required',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // TODO: Implement API call to create script
      // const response = await fetch('/api/scripts', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify({ name, description, source })
      // });

      toast({
        title: 'Success',
        description: 'Script created successfully',
      });

      // Reset form
      setName('');
      setDescription('');
      setSource('');
      setSha256('');
      onOpenChange(false);
      onSuccess?.();
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to create script',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>New Script</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Script Name</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Enter script name"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter script description (optional)"
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="source">Shell Script (.sh)</Label>
            <Textarea
              id="source"
              value={source}
              onChange={(e) => handleSourceChange(e.target.value)}
              placeholder="#!/bin/bash&#10;&#10;# Enter your shell script here"
              className="font-mono text-sm min-h-[300px]"
            />
          </div>

          {sha256 && (
            <div className="space-y-2">
              <Label>SHA256 Preview</Label>
              <div>
                <SHABadge sha256={sha256} />
              </div>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-4 border-t">
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={loading}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={loading || !name.trim() || !source.trim()}
            >
              {loading ? 'Creating...' : 'Create Script'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}