import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { 
  Shield, 
  Activity, 
  Key, 
  Lock,
  Users,
  FileText,
  ArrowRight,
  RefreshCw
} from 'lucide-react';
import { useSecurityDashboard } from '@/hooks/useSecurityDashboard';

const securitySections = [
  {
    title: 'Audit Trail',
    description: 'Complete activity log and security audit trail',
    icon: Activity,
    url: '/security/audit',
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10',
  },
  {
    title: 'Access Control', 
    description: 'User roles and permission management',
    icon: Users,
    url: '/access-control',
    color: 'text-green-500',
    bgColor: 'bg-green-500/10',
  },
  {
    title: 'API Security',
    description: 'API keys and authentication settings',
    icon: Key,
    url: '/api-keys',
    color: 'text-primary',
    bgColor: 'bg-primary/10',
  },
  {
    title: 'Compliance',
    description: 'Security policies and compliance reports',
    icon: FileText,
    url: '/security/compliance',
    color: 'text-orange-500',
    bgColor: 'bg-orange-500/10',
  },
];

export default function Security() {
  const { activeSessions, apiKeys, failedLogins, securityScore, loading, error, refreshData } = useSecurityDashboard();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <Shield className="h-8 w-8 text-primary" />
            Security Center
          </h1>
          <p className="text-muted-foreground mt-2">
            Manage security settings, audit trails, and compliance
          </p>
        </div>
        <Button 
          onClick={refreshData} 
          variant="outline" 
          size="sm"
          disabled={loading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </Button>
      </div>

      {/* Security Overview Stats - Moved to Top */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-primary border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">Active Sessions</p>
                <p className="text-3xl font-bold text-primary-foreground">
                  {loading ? '...' : activeSessions}
                </p>
                <p className="text-xs text-primary-foreground/60">Current user sessions</p>
              </div>
              <Users className="h-8 w-8 text-primary-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-secondary border-secondary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-secondary-foreground/80">API Keys</p>
                <p className="text-3xl font-bold text-secondary-foreground">
                  {loading ? '...' : apiKeys}
                </p>
                <p className="text-xs text-secondary-foreground/60">Active API keys</p>
              </div>
              <Key className="h-8 w-8 text-secondary-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-accent border-accent/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-accent-foreground/80">Failed Logins</p>
                <p className="text-3xl font-bold text-accent-foreground">
                  {loading ? '...' : failedLogins}
                </p>
                <p className="text-xs text-accent-foreground/60">Last 24 hours</p>
              </div>
              <Lock className="h-8 w-8 text-accent-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-card border-card-border shadow-card">
          <CardContent className={`p-6 rounded-lg bg-gradient-to-br from-card to-muted border border-card-border relative overflow-hidden shadow-sm ${
            securityScore === 'A+' || securityScore.startsWith('A') ? 'shadow-success/20' :
            securityScore.startsWith('B') ? 'shadow-orange-500/20' :
            'shadow-destructive/20'
          }`}>
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <div className="text-sm font-medium text-muted-foreground">Security Score</div>
                  <div className={`flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium ml-8 ${
                    securityScore === 'A+' || securityScore.startsWith('A') ? 'bg-success/20 text-success' :
                    securityScore.startsWith('B') ? 'bg-orange-500/20 text-orange-600' :
                    'bg-destructive/20 text-destructive'
                  }`}>
                    <span>
                      {securityScore === 'A+' ? 'Excellent security' : 
                       securityScore.startsWith('A') ? 'Good security' : 
                       securityScore.startsWith('B') ? 'Fair security' : 'Needs attention'}
                    </span>
                  </div>
                </div>
                <div className="text-4xl font-bold text-foreground mb-2">
                  {loading ? '...' : securityScore}
                </div>
                <div className="text-sm text-muted-foreground">
                  Current security rating
                </div>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/60" />
            </div>
            
            {/* Enhanced gradient overlays based on security score */}
            {(securityScore === 'A+' || securityScore.startsWith('A')) && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-success/15 via-success/5 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-success/25 via-success/10 to-transparent pointer-events-none"></div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-success/30 rounded-full blur-xl pointer-events-none"></div>
              </>
            )}
            
            {securityScore.startsWith('B') && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-500/15 via-orange-500/5 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-orange-500/25 via-orange-500/10 to-transparent pointer-events-none"></div>
                <div className="absolute -top-4 -right-4 w-16 h-16 bg-orange-500/30 rounded-full blur-xl pointer-events-none"></div>
              </>
            )}
            
            {(!securityScore.startsWith('A') && !securityScore.startsWith('B')) && (
              <>
                <div className="absolute inset-0 bg-gradient-to-br from-destructive/25 via-destructive/10 to-transparent pointer-events-none"></div>
                <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-radial from-destructive/40 via-destructive/20 to-transparent pointer-events-none"></div>
                <div className="absolute -top-4 -right-4 w-20 h-20 bg-destructive/50 rounded-full blur-xl pointer-events-none"></div>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/20 rounded-lg p-4">
          <p className="text-sm text-destructive">
            Error loading security data: {error}
          </p>
        </div>
      )}

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {securitySections.map((section) => {
          const Icon = section.icon;
          return (
            <Card key={section.title} className="group hover:shadow-md transition-smooth">
              <CardHeader className="pb-4">
                <div className={`w-12 h-12 rounded-lg ${section.bgColor} flex items-center justify-center mb-4`}>
                  <Icon className={`h-6 w-6 ${section.color}`} />
                </div>
                <CardTitle className="flex items-center justify-between">
                  {section.title}
                  <ArrowRight className="h-4 w-4 text-muted-foreground group-hover:text-foreground transition-smooth" />
                </CardTitle>
                <CardDescription>
                  {section.description}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button asChild variant="outline" className="w-full">
                  <Link to={section.url}>
                    Access {section.title}
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}