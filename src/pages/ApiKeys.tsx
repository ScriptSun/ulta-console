import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Key, Eye, EyeOff, Copy, RotateCcw, Trash2 } from 'lucide-react'
import { useState } from 'react'

export default function ApiKeys() {
  const [visibleKeys, setVisibleKeys] = useState<string[]>([])

  const apiKeys = [
    {
      id: 'key-001',
      name: 'Production API Key',
      key: 'sk-1234567890abcdef1234567890abcdef',
      status: 'active',
      lastUsed: '2 minutes ago',
      requests: '1.2K today',
      permissions: ['read', 'write', 'admin'],
      created: '2024-01-01'
    },
    {
      id: 'key-002',
      name: 'Development Key',
      key: 'sk-dev9876543210fedcba9876543210fedc',
      status: 'active',
      lastUsed: '1 hour ago',
      requests: '245 today',
      permissions: ['read', 'write'],
      created: '2024-01-10'
    },
    {
      id: 'key-003',
      name: 'Analytics Service',
      key: 'sk-analytics1234567890abcdef123456',
      status: 'expired',
      lastUsed: '30 days ago',
      requests: '0 today',
      permissions: ['read'],
      created: '2023-12-01'
    },
    {
      id: 'key-004',
      name: 'Testing Environment',
      key: 'sk-test9876543210fedcba9876543210f',
      status: 'revoked',
      lastUsed: 'Never',
      requests: '0 today',
      permissions: ['read'],
      created: '2024-01-14'
    }
  ]

  const toggleKeyVisibility = (keyId: string) => {
    setVisibleKeys(prev => 
      prev.includes(keyId) 
        ? prev.filter(id => id !== keyId)
        : [...prev, keyId]
    )
  }

  const maskKey = (key: string) => {
    return key.substring(0, 12) + '•'.repeat(20) + key.substring(key.length - 4)
  }

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
        <Button className="bg-gradient-primary hover:bg-primary-dark shadow-glow">
          <Key className="h-4 w-4 mr-2" />
          Generate New Key
        </Button>
      </div>

      {/* API Keys List */}
      <div className="space-y-4">
        {apiKeys.map((apiKey) => (
          <Card key={apiKey.id} className="bg-gradient-card border-card-border shadow-card">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Key className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="text-lg">{apiKey.name}</CardTitle>
                  <p className="text-sm text-muted-foreground">Created {apiKey.created}</p>
                </div>
              </div>
              <Badge variant="outline" className={getStatusColor(apiKey.status)}>
                {apiKey.status}
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* API Key Display */}
              <div className="space-y-2">
                <label className="text-sm font-medium text-foreground">API Key</label>
                <div className="flex items-center gap-2 p-3 bg-muted rounded-lg border">
                  <code className="flex-1 text-sm font-mono">
                    {visibleKeys.includes(apiKey.id) ? apiKey.key : maskKey(apiKey.key)}
                  </code>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => toggleKeyVisibility(apiKey.id)}
                  >
                    {visibleKeys.includes(apiKey.id) ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    onClick={() => navigator.clipboard.writeText(apiKey.key)}
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
                  <p className="text-sm font-medium">{apiKey.lastUsed}</p>
                </div>
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">Requests</p>
                  <p className="text-sm font-medium">{apiKey.requests}</p>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-2 border-t border-border">
                <Button variant="outline" size="sm" disabled={apiKey.status !== 'active'}>
                  <RotateCcw className="h-3 w-3 mr-1" />
                  Rotate
                </Button>
                <Button variant="outline" size="sm">
                  Edit Permissions
                </Button>
                <Button 
                  variant="outline" 
                  size="sm" 
                  className="text-destructive hover:text-destructive"
                >
                  <Trash2 className="h-3 w-3 mr-1" />
                  Revoke
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}