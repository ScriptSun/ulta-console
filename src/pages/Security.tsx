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
  ArrowRight
} from 'lucide-react';

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
    url: '/security/access',
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
      </div>

      {/* Security Overview Stats - Moved to Top */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-primary border-primary/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-primary-foreground/80">Active Sessions</p>
                <p className="text-3xl font-bold text-primary-foreground">12</p>
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
                <p className="text-3xl font-bold text-secondary-foreground">8</p>
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
                <p className="text-3xl font-bold text-accent-foreground">0</p>
                <p className="text-xs text-accent-foreground/60">Last 24 hours</p>
              </div>
              <Lock className="h-8 w-8 text-accent-foreground/60" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-muted border-muted/20">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground/80">Security Score</p>
                <p className="text-3xl font-bold text-foreground">A+</p>
                <p className="text-xs text-muted-foreground/60">Excellent security</p>
              </div>
              <Shield className="h-8 w-8 text-muted-foreground/60" />
            </div>
          </CardContent>
        </Card>
      </div>

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