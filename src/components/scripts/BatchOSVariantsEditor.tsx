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
        return <CheckCircle className="h-3 w-3 text-green-500" />;
      case 'draft':
        return <AlertTriangle className="h-3 w-3 text-blue-500" />;
      case 'missing':
        return <AlertTriangle className="h-3 w-3 text-orange-500" />;
      default:
        return null;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800 border-green-200';
      case 'draft':
        return 'bg-blue-100 text-blue-800 border-blue-200';
      case 'missing':
        return 'bg-orange-100 text-orange-800 border-orange-200';
      default:
        return 'bg-muted/50 text-muted-foreground border-muted';
    }
  };

  // Handle loading and empty states
  if (loading && variants.length === 0) {
    return (
      <Card>
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
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No OS targets configured for this batch
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {/* Modern Header */}
      <div className="relative">
        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-2xl blur-xl" />
        <div className="relative bg-card/40 backdrop-blur-sm border border-border/50 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
                <FileText className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <h3 className="text-xl font-semibold tracking-tight">OS Variants</h3>
                <p className="text-sm text-muted-foreground">Manage platform-specific script variants</p>
              </div>
            </div>
            {missingOSes.length > 0 && (
              <div className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-orange-500/10 to-yellow-500/10 border border-orange-200/30 rounded-full">
                <AlertTriangle className="h-4 w-4 text-orange-500" />
                <span className="text-sm font-medium text-orange-700">{missingOSes.length} variants missing</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modern OS Variant Tabs */}
      <Tabs value={selectedOs} onValueChange={setSelectedOs} className="w-full">
        <div className="relative mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-muted/20 to-muted/5 rounded-2xl" />
          <TabsList className="relative grid w-full grid-cols-auto gap-2 p-2 bg-card/60 backdrop-blur-sm border border-border/50 rounded-2xl">
            {osTargets.map(os => {
              const status = getVariantStatus(os);
              return (
                <TabsTrigger 
                  key={os} 
                  value={os} 
                  className="relative flex-1 px-6 py-3 rounded-xl transition-all duration-300 hover:scale-105 data-[state=active]:bg-gradient-to-r data-[state=active]:from-primary data-[state=active]:to-secondary data-[state=active]:text-primary-foreground data-[state=active]:shadow-lg data-[state=active]:shadow-primary/25"
                >
                  <div className="flex items-center gap-3">
                    <div className={`p-1.5 rounded-lg ${
                      status.status === 'active' ? 'bg-emerald-500/20' :
                      status.status === 'draft' ? 'bg-blue-500/20' : 'bg-orange-500/20'
                    }`}>
                      {getStatusIcon(status.status)}
                    </div>
                    <div className="flex flex-col items-start">
                      <span className="font-medium capitalize">{os}</span>
                      {status.version && (
                        <span className="text-xs opacity-75">v{status.version}</span>
                      )}
                    </div>
                  </div>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {osTargets.map(os => {
          const status = getVariantStatus(os);
          
          return (
            <TabsContent key={os} value={os} className="space-y-6 mt-0">
              {status.status === 'missing' ? (
                <div className="relative group">
                  <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-yellow-500/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <Card className="relative bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-orange-200/30 rounded-3xl overflow-hidden">
                    <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-orange-400 to-yellow-400" />
                    <CardContent className="p-12 text-center">
                      <div className="relative">
                        <div className="absolute inset-0 bg-gradient-to-br from-orange-500/20 to-yellow-500/20 rounded-full blur-2xl" />
                        <div className="relative h-20 w-20 mx-auto mb-6 bg-gradient-to-br from-orange-400 to-yellow-400 rounded-2xl flex items-center justify-center shadow-xl shadow-orange-500/25">
                          <AlertTriangle className="h-10 w-10 text-white" />
                        </div>
                      </div>
                      <h4 className="text-2xl font-bold bg-gradient-to-r from-orange-600 to-orange-800 bg-clip-text text-transparent mb-3">
                        No {os.charAt(0).toUpperCase() + os.slice(1)} Variant
                      </h4>
                      <p className="text-muted-foreground mb-8 max-w-md mx-auto leading-relaxed">
                        This OS is targeted but has no script variant. Create one to ensure compatibility across all platforms.
                      </p>
                      {canEdit && (
                        <div className="flex justify-center gap-4">
                          <Button 
                            onClick={() => handleCreateVariant(os)}
                            size="lg"
                            disabled={loading}
                            className="px-8 py-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Create Variant
                          </Button>
                          {variants.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="lg"
                              onClick={() => {
                                const sourceOs = variants[0]?.os;
                                if (sourceOs) handleCreateVariant(os, sourceOs);
                              }}
                              disabled={loading}
                              className="px-8 py-3 border-2 border-border/50 hover:border-primary/50 hover:bg-primary/5 transition-all duration-300"
                            >
                              <Copy className="h-4 w-4 mr-2" />
                              Copy from {variants[0]?.os}
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Modern Current Variant Info */}
                  <div className="relative group">
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/5 to-secondary/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                    <Card className="relative bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden">
                      <div className={`absolute top-0 left-0 right-0 h-1 ${
                        status.status === 'active' 
                          ? 'bg-gradient-to-r from-emerald-400 to-green-400' 
                          : 'bg-gradient-to-r from-blue-400 to-cyan-400'
                      }`} />
                      <CardHeader className="pb-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className={`h-12 w-12 rounded-2xl flex items-center justify-center ${
                              status.status === 'active' 
                                ? 'bg-gradient-to-br from-emerald-500 to-green-500' 
                                : 'bg-gradient-to-br from-blue-500 to-cyan-500'
                            } shadow-lg`}>
                              <span className="text-white font-bold text-lg capitalize">{os[0]}</span>
                            </div>
                            <div>
                              <CardTitle className="text-xl font-semibold capitalize">
                                {os} v{status.version}
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">Script variant configuration</p>
                            </div>
                          </div>
                          <div className={`px-4 py-2 rounded-full font-medium text-sm ${
                            status.status === 'active'
                              ? 'bg-gradient-to-r from-emerald-500/20 to-green-500/20 text-emerald-700 border border-emerald-200/50'
                              : 'bg-gradient-to-r from-blue-500/20 to-cyan-500/20 text-blue-700 border border-blue-200/50'
                          }`}>
                            {status.status === 'active' ? '✓ Active' : '◐ Draft'}
                          </div>
                        </div>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <div>
                          <div className="flex items-center gap-2 mb-3">
                            <Hash className="h-4 w-4 text-muted-foreground" />
                            <span className="text-sm font-medium text-muted-foreground">SHA256 Hash</span>
                          </div>
                          <div className="relative group/hash">
                            <div className="bg-gradient-to-r from-muted/50 to-muted/30 p-4 rounded-2xl border border-border/30">
                              <code className="font-mono text-xs break-all text-foreground/80 leading-relaxed">
                                {status.variant?.sha256}
                              </code>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Modern Script Source Editor */}
                  <div className="space-y-8">
                    <div className="relative group">
                      <div className="absolute inset-0 bg-gradient-to-br from-accent/5 to-primary/5 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                      <Card className="relative bg-gradient-to-br from-card/95 to-card/70 backdrop-blur-sm border border-border/50 rounded-3xl overflow-hidden">
                        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-accent to-primary" />
                        <CardHeader className="pb-4">
                          <div className="flex items-center gap-3">
                            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-accent to-primary flex items-center justify-center">
                              <FileText className="h-5 w-5 text-primary-foreground" />
                            </div>
                            <div>
                              <CardTitle className="text-lg font-semibold">Script Source</CardTitle>
                              <p className="text-sm text-muted-foreground">Edit your bash script code</p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="p-6">
                          <div className="w-full">
                            <BatchCodeEditor
                              content={variantSources[os] || status.variant?.source || ''}
                              onChange={handleSourceChange}
                              readOnly={!canEdit}
                              className="w-full"
                            />
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {canEdit && (
                      <div className="relative group mt-8">
                        <div className="absolute inset-0 bg-gradient-to-br from-secondary/10 to-accent/10 rounded-3xl blur-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                        <Card className="relative bg-gradient-to-br from-card/90 to-card/60 backdrop-blur-sm border-2 border-dashed border-primary/30 rounded-3xl overflow-hidden">
                          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-secondary to-accent" />
                          <CardContent className="p-8">
                            <div className="space-y-6">
                              <div className="flex items-center gap-3 mb-6">
                                <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-secondary to-accent flex items-center justify-center">
                                  <FileText className="h-5 w-5 text-primary-foreground" />
                                </div>
                                <div>
                                  <h4 className="text-lg font-semibold">Create New Version</h4>
                                  <p className="text-sm text-muted-foreground">Document your changes and create a new version</p>
                                </div>
                              </div>
                              
                              <div className="space-y-4">
                                <div>
                                  <label className="block text-sm font-semibold text-foreground mb-3">
                                    Version Notes
                                  </label>
                                  <div className="relative">
                                    <textarea
                                      value={variantNotes[os] || ''}
                                      onChange={(e) => handleNotesChange(e.target.value)}
                                      placeholder="Describe the changes in this version..."
                                      className="w-full min-h-[100px] p-4 bg-gradient-to-br from-background/90 to-background/70 backdrop-blur-sm border border-border/50 rounded-2xl resize-y text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary/50 transition-all duration-300"
                                      rows={4}
                                    />
                                    <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-primary/5 to-secondary/5 opacity-0 hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                                  </div>
                                </div>
                                <div className="flex justify-end pt-4">
                                  <Button
                                    onClick={() => handleCreateVersion(os)}
                                    disabled={!variantSources[os] || loading}
                                    size="lg"
                                    className="px-8 py-3 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90 shadow-lg shadow-primary/25 transition-all duration-300 hover:scale-105"
                                  >
                                    Create New Version
                                  </Button>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
}