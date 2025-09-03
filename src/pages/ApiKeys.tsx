import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Checkbox } from '@/components/ui/checkbox'
import { Key, Eye, EyeOff, Copy, RotateCcw, Trash2, Plus } from 'lucide-react'
import { useState } from 'react'
import { useApiKeys, type NewApiKey } from '@/hooks/useApiKeys'
import { useToast } from '@/hooks/use-toast'
import { Skeleton } from '@/components/ui/skeleton'

export default function ApiKeys() {
  const [visibleKeys, setVisibleKeys] = useState<string[]>([])
  const [newApiKey, setNewApiKey] = useState<NewApiKey | null>(null)
  const [showNewKeyDialog, setShowNewKeyDialog] = useState(false)
  const [generateDialog, setGenerateDialog] = useState(false)
  const [newKeyName, setNewKeyName] = useState('')
  const [newKeyPermissions, setNewKeyPermissions] = useState<string[]>(['read'])
  const [isGenerating, setIsGenerating] = useState(false)
  
  const { apiKeys, loading, generateApiKey, revokeApiKey, updateApiKey } = useApiKeys()
  const { toast } = useToast()

  const handleGenerateKey = async () => {
    if (!newKeyName.trim()) {
      toast({
        title: "Error",
        description: "Please enter a name for the API key",
        variant: "destructive",
      });
      return;
    }

    const result = await generateApiKey(newKeyName, newKeyPermissions);
    if (result) {
      setNewApiKey(result);
      setShowNewKeyDialog(true);
      setGenerateDialog(false);
      setNewKeyName('');
      setNewKeyPermissions(['read']);
    }
  };

  const handlePermissionChange = (permission: string, checked: boolean) => {
    if (checked) {
      setNewKeyPermissions(prev => [...prev, permission]);
    } else {
      setNewKeyPermissions(prev => prev.filter(p => p !== permission));
    }
  };

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => 
      prev.includes(keyId) 
        ? prev.filter(id => id !== keyId)
        : [...prev, keyId]
    )
  }

  const maskKey = (keyPrefix: string) => {
    return keyPrefix + '•'.repeat(48);
  }

  const formatLastUsed = (lastUsedAt?: string) => {
    if (!lastUsedAt) return 'Never';
    const date = new Date(lastUsedAt);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    
    if (diffMins < 60) return `${diffMins} minutes ago`;
    if (diffHours < 24) return `${diffHours} hours ago`;
    return `${diffDays} days ago`;
  };

  const formatRequestCount = (dailyCount: number, totalCount: number) => {
    if (dailyCount === 0) return '0 today';
    if (dailyCount < 1000) return `${dailyCount} today`;
    return `${(dailyCount / 1000).toFixed(1)}K today`;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-success/10 text-success border-success/20'
      case 'expired': return 'bg-warning/10 text-warning border-warning/20'
      case 'revoked': return 'bg-destructive/10 text-destructive border-destructive/20'
      default: return 'bg-muted/10 text-muted-foreground border-muted/20'
    }
  }

   const getPermissionColor = (permission: string) => {
     switch (permission) {
       case 'admin': return 'bg-destructive/10 text-destructive border-destructive/20'
       case 'partner': return 'bg-primary/10 text-primary border-primary/20'
       case 'write': return 'bg-warning/10 text-warning border-warning/20'
       case 'read': return 'bg-success/10 text-success border-success/20'
       default: return 'bg-muted/10 text-muted-foreground border-muted/20'
     }
   }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-foreground">API Keys</h1>
          <p className="text-muted-foreground">
            Manage API keys and access tokens
          </p>
        </div>
        <Dialog open={generateDialog} onOpenChange={setGenerateDialog}>
          <DialogTrigger asChild>
            <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow">
              <Plus className="h-4 w-4 mr-2" />
              Generate New Key
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Generate New API Key</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="keyName">API Key Name</Label>
                <Input
                  id="keyName"
                  value={newKeyName}
                  onChange={(e) => setNewKeyName(e.target.value)}
                  placeholder="e.g., Production API Key"
                />
              </div>
              <div>
                <Label>Permissions</Label>
                 <div className="space-y-2 mt-2">
                   {['read', 'write', 'admin', 'partner'].map((permission) => (
                     <div key={permission} className="flex items-center space-x-2">
                       <Checkbox
                         id={permission}
                         checked={newKeyPermissions.includes(permission)}
                         onCheckedChange={(checked) => handlePermissionChange(permission, !!checked)}
                       />
                       <Label htmlFor={permission} className="capitalize">
                         {permission === 'partner' ? 'Partner (Billing API)' : permission}
                       </Label>
                     </div>
                   ))}
                </div>
              </div>
              <Button onClick={handleGenerateKey} className="w-full">
                Generate API Key
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* New API Key Dialog */}
      <Dialog open={showNewKeyDialog} onOpenChange={setShowNewKeyDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>API Key Generated Successfully</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <p className="text-sm text-yellow-800 font-medium mb-2">
                ⚠️ Important: Copy this API key now. It won't be shown again.
              </p>
            </div>
            {newApiKey && (
              <div className="space-y-2">
                <Label>Your new API key</Label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                  <code className="flex-1 text-sm font-mono break-all">
                    {newApiKey.api_key}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(newApiKey.api_key);
                      toast({ title: "Copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
            <Button onClick={() => setShowNewKeyDialog(false)} className="w-full">
              I've saved the key securely
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* API Keys List */}
      <div className="space-y-4">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <Card key={i} className="bg-gradient-card border-card-border">
                <CardHeader>
                  <Skeleton className="h-6 w-48" />
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-20 w-full" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : apiKeys.length === 0 ? (
          <Card className="bg-gradient-card border-card-border text-center p-8">
            <Key className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-medium mb-2">No API Keys</h3>
            <p className="text-muted-foreground mb-4">
              Create your first API key to start integrating with your applications.
            </p>
          </Card>
        ) : (
          apiKeys.map((apiKey) => (
          <Card key={apiKey.id} className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Created {new Date(apiKey.created_at).toLocaleDateString()}
                  </p>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(apiKey.status)}>
                {apiKey.status.charAt(0).toUpperCase() + apiKey.status.slice(1)}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">API Key</label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                  <code className="flex-1 text-sm font-mono">
                    {maskKey(apiKey.key_prefix)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => {
                      navigator.clipboard.writeText(apiKey.key_prefix);
                      toast({ title: "Key prefix copied to clipboard" });
                    }}
                  >
                    <Copy className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Permissions */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">Permissions</label>
                <div className="flex flex-wrap gap-2">
                  {apiKey.permissions.map((permission) => (
                    <Badge 
                      key={permission} 
                      variant="outline" 
                      className={getPermissionColor(permission)}
                    >
                      {permission}
                    </Badge>
                  ))}
                </div>
              </div>

              {/* Usage Stats */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2 border-t border-border">
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Last Used</p>
                  <p className="text-sm font-medium">{formatLastUsed(apiKey.last_used_at)}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Requests</p>
                  <p className="text-sm font-medium">
                    {formatRequestCount(apiKey.daily_request_count, apiKey.request_count)}
                  </p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => revokeApiKey(apiKey.id)}
                  disabled={apiKey.status !== 'active'}
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
          ))
        )}
      </div>
    </div>
  )
}