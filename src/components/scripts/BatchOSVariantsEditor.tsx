import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Plus, Copy, FileText, Hash } from 'lucide-react';
import { BatchCodeEditor } from './BatchCodeEditor';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BatchVariant {
  id: string;
  batch_id: string;
  os: string;
  version: number;
  sha256: string;
  source: string;
  notes?: string;
  active: boolean;
  min_os_version?: string;
  created_at: string;
  created_by: string;
}

interface BatchOSVariantsEditorProps {
  batchId: string;
  osTargets: string[];
  canEdit: boolean;
  canActivate: boolean;
  onSuccess?: () => void;
}

export function BatchOSVariantsEditor({ 
  batchId, 
  osTargets, 
  canEdit, 
  canActivate, 
  onSuccess 
}: BatchOSVariantsEditorProps) {
  const [variants, setVariants] = useState<BatchVariant[]>([]);
  const [selectedOs, setSelectedOs] = useState<string>(osTargets[0] || '');
  const [loading, setLoading] = useState(false);
  const [variantSources, setVariantSources] = useState<Record<string, string>>({});
  const [variantNotes, setVariantNotes] = useState<Record<string, string>>({});
  
  const { toast } = useToast();

  // Fetch variants when component mounts or batchId changes
  useEffect(() => {
    if (batchId && osTargets?.length > 0) {
      fetchVariants();
    }
  }, [batchId, osTargets?.length]);

  const fetchVariants = async () => {
    if (!batchId) return;
    
    setLoading(true);
    try {
      // Always use direct database query for better reliability
      const { data: directData, error: directError } = await supabase
        .from('script_batch_variants')
        .select(`
          id,
          batch_id,
          os,
          version,
          sha256,
          source,
          notes,
          active,
          min_os_version,
          created_at,
          created_by
        `)
        .eq('batch_id', batchId)
        .order('os')
        .order('version', { ascending: false });

      if (directError) {
        console.error('Database error:', directError);
        throw new Error(`Database error: ${directError.message}`);
      }

      // Set variants with empty array as fallback
      setVariants((directData || []) as BatchVariant[]);
      
      // Clear any previous error state
      console.log(`Loaded ${directData?.length || 0} variants for batch ${batchId}`);
      
    } catch (error) {
      console.error('Error fetching variants:', error);
      // Set empty array on error to prevent undefined state
      setVariants([]);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to load batch variants',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Get variant status for each OS
  const getVariantStatus = (os: string) => {
    const activeVariant = variants.find(v => v.os === os && v.active);
    const hasVariants = variants.some(v => v.os === os);
    
    if (activeVariant) {
      return { status: 'active', version: activeVariant.version, variant: activeVariant };
    } else if (hasVariants) {
      const latestVariant = variants
        .filter(v => v.os === os)
        .sort((a, b) => b.version - a.version)[0];
      return { status: 'draft', version: latestVariant.version, variant: latestVariant };
    }
    return { status: 'missing', version: null, variant: null };
  };

  const handleCreateVariant = async (os: string, sourceFromOs?: string) => {
    if (!canEdit) return;
    
    setLoading(true);
    try {
      let source = variantSources[os] || '';
      
      // If duplicating from another OS, get the source
      if (sourceFromOs) {
        const sourceVariant = getVariantStatus(sourceFromOs).variant;
        source = sourceVariant?.source || '';
      }

      // Default source if empty
      if (!source) {
        source = `#!/bin/bash
# ${os.charAt(0).toUpperCase() + os.slice(1)} script for batch
echo "Running on ${os}"
`;
      }

      // Calculate SHA256 and size
      const encoder = new TextEncoder();
      const data = encoder.encode(source);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const size_bytes = data.length;

      // Use direct database insertion for reliability
      const { data: newVariant, error } = await supabase
        .from('script_batch_variants')
        .insert({
          batch_id: batchId,
          os,
          source,
          notes: variantNotes[os] || `Initial ${os} variant`,
          min_os_version: null,
          version: 1,
          active: false,
          sha256,
          size_bytes
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to create variant: ${error.message}`);
      }

      toast({
        title: 'Variant Created',
        description: `${os.charAt(0).toUpperCase() + os.slice(1)} variant created successfully`,
      });

      // Refresh variants
      await fetchVariants();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating variant:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create variant',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSourceChange = (source: string) => {
    setVariantSources(prev => ({ ...prev, [selectedOs]: source }));
  };

  const handleNotesChange = (notes: string) => {
    setVariantNotes(prev => ({ ...prev, [selectedOs]: notes }));
  };

  const handleCreateVersion = async (os: string) => {
    if (!canEdit) return;
    
    const source = variantSources[os];
    const notes = variantNotes[os];
    
    if (!source) {
      toast({
        title: 'Error',
        description: 'Please add source code before creating version',
        variant: 'destructive',
      });
      return;
    }

    setLoading(true);
    try {
      // Get next version number
      const { data: existingVersions } = await supabase
        .from('script_batch_variants')
        .select('version')
        .eq('batch_id', batchId)
        .eq('os', os)
        .order('version', { ascending: false })
        .limit(1);

      const nextVersion = (existingVersions?.[0]?.version || 0) + 1;

      // Calculate SHA256 and size
      const encoder = new TextEncoder();
      const data = encoder.encode(source);
      const hashBuffer = await crypto.subtle.digest('SHA-256', data);
      const hashArray = Array.from(new Uint8Array(hashBuffer));
      const sha256 = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
      const size_bytes = data.length;

      // Create new version using direct database insertion
      const { data: newVersion, error } = await supabase
        .from('script_batch_variants')
        .insert({
          batch_id: batchId,
          os,
          source,
          notes: notes || `Version ${nextVersion} for ${os}`,
          min_os_version: null,
          version: nextVersion,
          active: false,
          sha256,
          size_bytes
        })
        .select()
        .single();

      if (error) {
        console.error('Database error:', error);
        throw new Error(`Failed to create version: ${error.message}`);
      }

      toast({
        title: 'Version Created',
        description: `Version ${nextVersion} created for ${os}`,
      });

      // Clear local state
      setVariantSources(prev => ({ ...prev, [os]: '' }));
      setVariantNotes(prev => ({ ...prev, [os]: '' }));
      
      // Refresh variants
      await fetchVariants();
      onSuccess?.();
    } catch (error) {
      console.error('Error creating version:', error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : 'Failed to create version',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  // Safe variable access with null checks
  const currentVariant = selectedOs ? getVariantStatus(selectedOs) : { status: 'missing', version: null, variant: null };
  const missingOSes = osTargets?.filter(os => getVariantStatus(os).status === 'missing') || [];

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'active':
        return <CheckCircle className="h-4 w-4 text-success" />;
      case 'draft':
        return <AlertTriangle className="h-4 w-4 text-primary" />;
      case 'missing':
        return <AlertTriangle className="h-4 w-4 text-warning" />;
      default:
        return null;
    }
  };

  // Handle loading and empty states
  if (loading && variants.length === 0) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            Loading batch variants...
          </div>
        </CardContent>
      </Card>
    );
  }

  // Handle case where no OS targets are provided
  if (!osTargets?.length) {
    return (
      <Card className="bg-card border-border">
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No OS targets configured for this batch
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header Section */}
      <Card className="bg-card border-border">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-lg bg-primary flex items-center justify-center">
                <FileText className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <CardTitle className="text-foreground">OS Script Variants</CardTitle>
                <p className="text-muted-foreground">
                  Manage platform-specific script implementations
                </p>
              </div>
            </div>
            {missingOSes.length > 0 && (
              <Badge variant="outline" className="text-warning border-warning">
                {missingOSes.length} missing
              </Badge>
            )}
          </div>
        </CardHeader>
      </Card>

      {/* OS Tabs Section */}
      <Tabs value={selectedOs} onValueChange={setSelectedOs} className="w-full">
        <TabsList className="grid w-full bg-muted border-border" style={{ gridTemplateColumns: `repeat(${osTargets.length}, 1fr)` }}>
          {osTargets.map(os => {
            const status = getVariantStatus(os);
            return (
              <TabsTrigger 
                key={os} 
                value={os} 
                className="data-[state=active]:bg-card data-[state=active]:text-foreground text-muted-foreground"
              >
                <div className="flex items-center gap-2">
                  {getStatusIcon(status.status)}
                  <span className="capitalize font-medium">{os}</span>
                  {status.version && (
                    <Badge variant="secondary" className="text-xs bg-secondary text-secondary-foreground">
                      v{status.version}
                    </Badge>
                  )}
                </div>
              </TabsTrigger>
            );
          })}
        </TabsList>

        {/* Tab Content */}
        {osTargets.map(os => {
          const status = getVariantStatus(os);
          
          return (
            <TabsContent key={os} value={os} className="space-y-6 mt-6">
              {status.status === 'missing' ? (
                /* Missing Variant State */
                <Card className="bg-card border-border">
                  <CardContent className="p-8 text-center">
                    <div className="h-16 w-16 mx-auto mb-4 rounded-lg bg-warning/10 border border-warning/20 flex items-center justify-center">
                      <AlertTriangle className="h-8 w-8 text-warning" />
                    </div>
                    <h4 className="text-lg font-semibold text-foreground mb-2">
                      No {os.charAt(0).toUpperCase() + os.slice(1)} Variant
                    </h4>
                    <p className="text-muted-foreground mb-6 max-w-md mx-auto">
                      This OS is targeted but has no script variant. Create one to ensure compatibility.
                    </p>
                    {canEdit && (
                      <div className="flex justify-center gap-3">
                        <Button 
                          onClick={() => handleCreateVariant(os)}
                          disabled={loading}
                          className="bg-primary text-primary-foreground hover:bg-primary/90"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Create Variant
                        </Button>
                        {variants.length > 0 && (
                          <Button 
                            variant="outline" 
                            onClick={() => {
                              const sourceOs = variants[0]?.os;
                              if (sourceOs) handleCreateVariant(os, sourceOs);
                            }}
                            disabled={loading}
                            className="border-border text-foreground hover:bg-accent"
                          >
                            <Copy className="h-4 w-4 mr-2" />
                            Copy from {variants[0]?.os}
                          </Button>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ) : (
                <div className="space-y-6">
                  {/* Current Variant Info */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className={`h-12 w-12 rounded-lg flex items-center justify-center ${
                            status.status === 'active' 
                              ? 'bg-success text-success-foreground' 
                              : 'bg-primary text-primary-foreground'
                          }`}>
                            <span className="font-bold text-lg capitalize">{os[0]}</span>
                          </div>
                          <div>
                            <CardTitle className="text-foreground capitalize">
                              {os} v{status.version}
                            </CardTitle>
                            <p className="text-muted-foreground">Script variant configuration</p>
                          </div>
                        </div>
                        <Badge 
                          variant={status.status === 'active' ? 'default' : 'secondary'}
                          className={status.status === 'active' 
                            ? 'bg-success text-success-foreground' 
                            : 'bg-secondary text-secondary-foreground'
                          }
                        >
                          {status.status === 'active' ? '✓ Active' : '◐ Draft'}
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div>
                        <div className="flex items-center gap-2 mb-3">
                          <Hash className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm font-medium text-muted-foreground">SHA256 Hash</span>
                        </div>
                        <div className="bg-muted/50 p-3 rounded-md border border-border">
                          <code className="font-mono text-xs break-all text-foreground">
                            {status.variant?.sha256}
                          </code>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Script Source Editor */}
                  <Card className="bg-card border-border">
                    <CardHeader>
                      <CardTitle className="text-foreground flex items-center gap-2">
                        <FileText className="h-5 w-5" />
                        Script Source Editor
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-6">
                      <BatchCodeEditor
                        content={variantSources[os] || status.variant?.source || ''}
                        onChange={handleSourceChange}
                        readOnly={!canEdit}
                      />
                    </CardContent>
                  </Card>
                  
                  {/* Create New Version Section */}
                  {canEdit && (
                    <Card className="bg-card border-2 border-dashed border-border">
                      <CardHeader>
                        <CardTitle className="text-foreground flex items-center gap-2">
                          <Plus className="h-5 w-5" />
                          Create New Version
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <label className="block text-sm font-medium text-foreground mb-2">
                            Version Notes
                          </label>
                          <textarea
                            value={variantNotes[os] || ''}
                            onChange={(e) => handleNotesChange(e.target.value)}
                            placeholder="Describe changes in this version..."
                            className="w-full min-h-[100px] p-3 bg-background border border-border rounded-md text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary resize-y"
                            rows={4}
                          />
                        </div>
                        <div className="flex justify-end">
                          <Button
                            onClick={() => handleCreateVersion(os)}
                            disabled={!variantSources[os] || loading}
                            className="bg-primary text-primary-foreground hover:bg-primary/90"
                          >
                            Create New Version
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}