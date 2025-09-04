import React, { useState } from 'react';
import { FileText, Database, Shield, Users, Key, Clock, Lock, Eye, EyeOff } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useToast } from '@/hooks/use-toast';
import jsPDF from 'jspdf';

interface SystemDocumentationProps {
  children: React.ReactNode;
}

export function SystemDocumentation({ children }: SystemDocumentationProps) {
  const { toast } = useToast();
  const [showSensitiveInfo, setShowSensitiveInfo] = useState(false);

  const exportToPDF = async () => {
    try {
      const pdf = new jsPDF();
      let yPosition = 20;
      const pageHeight = 280;
      const margin = 20;
      
      const addNewPageIfNeeded = (requiredSpace = 20) => {
        if (yPosition + requiredSpace > pageHeight) {
          pdf.addPage();
          yPosition = margin;
        }
      };
      
      const addText = (text: string, fontSize = 12, indent = 0) => {
        pdf.setFontSize(fontSize);
        const lines = pdf.splitTextToSize(text, 170 - indent);
        lines.forEach((line: string) => {
          addNewPageIfNeeded();
          pdf.text(line, margin + indent, yPosition);
          yPosition += fontSize * 0.4;
        });
        yPosition += 3;
      };
      
      const addTitle = (title: string, fontSize = 16) => {
        addNewPageIfNeeded(30);
        yPosition += 10;
        pdf.setFontSize(fontSize);
        pdf.text(title, margin, yPosition);
        yPosition += fontSize * 0.6;
        // Add underline
        pdf.line(margin, yPosition, margin + 170, yPosition);
        yPosition += 10;
      };
      
      const addCodeBlock = (title: string, code: string) => {
        addNewPageIfNeeded(40);
        pdf.setFontSize(11);
        pdf.text(title + ':', margin, yPosition);
        yPosition += 8;
        
        // Add background for code
        const codeLines = code.split('\n');
        const codeHeight = codeLines.length * 4 + 8;
        pdf.setFillColor(245, 245, 245);
        pdf.rect(margin, yPosition - 4, 170, codeHeight, 'F');
        
        pdf.setFontSize(9);
        codeLines.forEach(line => {
          addNewPageIfNeeded();
          pdf.text(line, margin + 5, yPosition);
          yPosition += 4;
        });
        yPosition += 10;
      };

      // Main Title
      pdf.setFontSize(24);
      pdf.text('System Documentation', margin, yPosition);
      yPosition += 20;
      
      // Table of Contents
      addTitle('Table of Contents', 18);
      addText('1. Enhanced Security System', 12, 5);
      addText('2. Database Schema Overview', 12, 5);
      addText('3. Session Management System', 12, 5);
      addText('4. Authentication Flow', 12, 5);
      addText('5. API Security & Rate Limiting', 12, 5);
      addText('6. System Architecture', 12, 5);
      
      // 1. SECURITY TAB CONTENT
      pdf.addPage();
      yPosition = margin;
      addTitle('1. Enhanced Security System', 18);
      
      addText('Comprehensive security features protecting your application:', 14);
      
      addText('Active Security Features:', 13);
      const securityFeatures = [
        '✅ Password complexity enforcement',
        '✅ Brute force attack protection',
        '✅ Session security management', 
        '✅ Real-time security monitoring',
        '✅ Configurable lockout policies',
        '✅ Enhanced login flow with security alerts'
      ];
      securityFeatures.forEach(feature => addText(feature, 11, 10));
      
      addText('Security Configuration:', 13);
      const configItems = [
        '• Maximum failed login attempts: 5',
        '• Account lockout duration: 30 minutes',
        '• Session timeout: 24 hours', 
        '• Password minimum length: 8 characters',
        '• Special characters required: Yes',
        '• Real-time session monitoring: Active'
      ];
      configItems.forEach(item => addText(item, 11, 10));
      
      addCodeBlock('Security Settings Database Function', `-- Database function for security settings
CREATE OR REPLACE FUNCTION get_security_settings()
RETURNS TABLE(
  max_login_attempts integer,
  session_timeout_hours integer,
  require_2fa boolean,
  password_min_length integer,
  require_special_chars boolean,
  lockout_duration integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  settings_data JSONB;
BEGIN
  SELECT setting_value INTO settings_data
  FROM system_settings WHERE setting_key = 'security';
  
  RETURN QUERY SELECT 
    COALESCE((settings_data->>'maxFailedLogins')::INTEGER, 5),
    COALESCE((settings_data->>'sessionTimeout')::INTEGER, 24),
    COALESCE((settings_data->>'twoFactorRequired')::BOOLEAN, false),
    COALESCE((settings_data->>'passwordMinLength')::INTEGER, 8),
    COALESCE((settings_data->>'passwordRequireSpecialChars')::BOOLEAN, true),
    COALESCE((settings_data->>'lockoutDuration')::INTEGER, 30);
END;
$$;`);

      addCodeBlock('Enhanced Security Hook Usage', `// Frontend security integration
const {
  isSessionValid,
  securityStatus,
  performSecureLogin,
  validatePassword,
  checkBanStatus
} = useEnhancedSecurity();

// Secure login with enhanced validation
const result = await performSecureLogin(
  email,
  password,
  clientIP,
  userAgent
);`);

      // 2. DATABASE TAB CONTENT  
      addTitle('2. Database Schema Overview', 18);
      addText('Core tables and security-related schema', 12);
      
      addText('Security Tables:', 13);
      addText('• user_security_status - Tracks user security information', 11, 10);
      addText('• user_login_attempts - Logs all login attempts', 11, 10);
      addText('• user_sessions - Active session tracking', 11, 10);
      addText('• system_settings - Configuration storage', 11, 10);
      
      addText('Core Application Tables:', 13);
      addText('• agents - AI agent configurations', 11, 10);
      addText('• chat_conversations - User conversations', 11, 10);
      addText('• audit_logs - System audit trail', 11, 10);
      addText('• api_keys - API access management', 11, 10);

      addCodeBlock('User Security Status Table Structure', `-- Table structure for tracking user security
CREATE TABLE user_security_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  failed_login_count integer DEFAULT 0,
  last_successful_login timestamptz,
  last_failed_login timestamptz,
  is_banned boolean DEFAULT false,
  ban_reason text,
  banned_at timestamptz,
  banned_until timestamptz,
  session_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`);

      addCodeBlock('User Sessions Table Structure', `-- Active session tracking
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  ip_address inet,
  user_agent text,
  device_type text,
  browser text,
  os text,
  location text,
  is_active boolean DEFAULT true,
  session_start timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`);

      // 3. SESSION MANAGEMENT TAB CONTENT
      addTitle('3. Session Management System', 18);
      addText('How sessions are created, tracked, and invalidated', 12);
      
      addText('Session Lifecycle:', 13);
      addText('1. User authenticates via enhanced login', 11, 10);
      addText('2. Session created with device fingerprinting', 11, 10);
      addText('3. Periodic session validation (every 5 minutes)', 11, 10);
      addText('4. Automatic cleanup of expired sessions', 11, 10);

      addCodeBlock('Session Creation Process (Edge Function)', `// Session management edge function
export default async function handler(req: Request) {
  const { action, user_id, ip_address, user_agent } = await req.json();
  
  switch (action) {
    case 'create':
      // Create new session with device fingerprinting
      const sessionId = await createUserSession({
        user_id,
        ip_address,
        user_agent,
        device_type: parseDeviceType(user_agent),
        location: await getLocationFromIP(ip_address)
      });
      return new Response(JSON.stringify({ session_id: sessionId }));
      
    case 'heartbeat':
      // Update session activity
      await updateSessionActivity(session_id);
      return new Response(JSON.stringify({ success: true }));
      
    case 'revoke':
      // Invalidate specific session
      await revokeSession(session_id);
      return new Response(JSON.stringify({ success: true }));
  }
}`);

      addCodeBlock('Frontend Session Monitoring', `// Automatic session validation
useEffect(() => {
  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isValid = await checkSessionValidity(user.id);
      if (!isValid) {
        await supabase.auth.signOut();
      }
    }
  };

  // Check every 5 minutes
  const interval = setInterval(checkSession, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);`);

      // 4. AUTHENTICATION TAB CONTENT
      addTitle('4. Authentication Flow', 18);
      addText('Enhanced authentication with security validation', 12);

      addCodeBlock('Enhanced Login Function (Edge Function)', `export default async function handler(req: Request) {
  const { email, password, ip_address, user_agent } = await req.json();
  
  // Check if user is banned or locked out
  const banStatus = await checkUserBanStatus(email);
  if (banStatus.is_banned) {
    return errorResponse('Account temporarily locked', {
      ban_reason: banStatus.ban_reason,
      locked_until: banStatus.banned_until
    });
  }
  
  // Attempt authentication
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    // Track failed attempt
    await trackLoginAttempt(email, false, ip_address, user_agent);
    return errorResponse('Invalid credentials');
  }
  
  // Track successful login
  await trackLoginAttempt(email, true, ip_address, user_agent, data.user.id);
  
  // Create session
  await createUserSession(data.user.id, ip_address, user_agent);
  
  return successResponse({ user: data.user, session: data.session });
}`);

      addCodeBlock('Password Validation', `// Frontend password validation
const validatePassword = async (password: string) => {
  const { data } = await supabase.functions.invoke('auth-security-enhanced', {
    body: { action: 'validate_password', password }
  });
  
  return data.validation; // { valid: boolean, errors: string[] }
};

// Usage in forms
const handlePasswordChange = async (password: string) => {
  const validation = await validatePassword(password);
  if (!validation.valid) {
    setErrors(validation.errors);
  }
};`);

      // 5. API SECURITY TAB CONTENT
      addTitle('5. API Security & Rate Limiting', 18);

      addCodeBlock('API Key Management', `-- Generate secure API key
CREATE OR REPLACE FUNCTION generate_api_key(
  _customer_id uuid,
  _name text,
  _permissions text[] DEFAULT ARRAY['read']
) RETURNS TABLE(id uuid, api_key text, key_prefix text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _key_id UUID;
  _api_key TEXT;
  _key_hash TEXT;
BEGIN
  -- Generate secure key
  _api_key := 'sk-' || encode(gen_random_bytes(32), 'hex');
  _key_hash := encode(digest(_api_key, 'sha256'), 'hex');
  
  INSERT INTO api_keys (customer_id, name, key_hash, permissions)
  VALUES (_customer_id, _name, _key_hash, _permissions)
  RETURNING id INTO _key_id;
  
  RETURN QUERY SELECT _key_id, _api_key, substring(_api_key, 1, 12);
END;
$$;`);

      addCodeBlock('Rate Limiting Implementation', `-- Rate limiting function
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  _team_id uuid,
  _user_id uuid,
  _limit_type text,
  _max_count integer,
  _window_hours integer DEFAULT 24
) RETURNS TABLE(
  allowed boolean,
  current_count integer,
  retry_after_seconds integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Implementation of sliding window rate limiting
  -- Tracks usage per team/user/limit type combination
END;
$$;`);

      // 6. ARCHITECTURE TAB CONTENT
      addTitle('6. System Architecture', 18);
      addText('Technology stack and architectural overview', 12);
      
      addText('Frontend Stack:', 13);
      addText('• React 18 - Modern React with hooks and concurrent features', 11, 10);
      addText('• TypeScript - Type-safe development environment', 11, 10);
      addText('• Tailwind CSS - Utility-first CSS framework', 11, 10);
      addText('• Vite - Fast build tool and development server', 11, 10);
      addText('• Supabase Client - Real-time database client', 11, 10);
      
      addText('Backend Stack:', 13);
      addText('• Supabase - Backend-as-a-Service platform', 11, 10);
      addText('• PostgreSQL - Robust relational database', 11, 10);
      addText('• Edge Functions (Deno) - Serverless compute', 11, 10);
      addText('• Row Level Security - Database-level access control', 11, 10);
      addText('• Real-time Subscriptions - Live data updates', 11, 10);
      
      addText('Security Features:', 13);
      addText('• JWT Authentication - Secure token-based auth', 11, 10);
      addText('• RLS Policies - Fine-grained access control', 11, 10);
      addText('• API Rate Limiting - Prevent abuse and overuse', 11, 10);
      addText('• Session Management - Secure session tracking', 11, 10);
      addText('• Audit Logging - Complete activity tracking', 11, 10);

      addCodeBlock('Project Structure', `src/
├── components/
│   ├── ui/                    # Shadcn/ui components
│   ├── dashboard/             # Dashboard-specific components
│   ├── auth/                  # Authentication components
│   └── security/              # Security features
├── hooks/
│   ├── useEnhancedSecurity.tsx    # Security hook
│   ├── useSecurityEnforcement.tsx # Security enforcement  
│   └── useDateRangeFilter.tsx     # Dashboard filtering
├── pages/
│   ├── Auth.tsx               # Login/register pages
│   ├── Dashboard.tsx          # Main dashboard
│   └── SecuritySettings.tsx   # Security configuration
├── contexts/
│   └── AuthContext.tsx        # Global auth state
supabase/
├── functions/
│   ├── auth-security-enhanced/    # Enhanced auth
│   └── session-management/        # Session handling
└── migrations/                # Database schema changes`);

      addCodeBlock('Environment & Deployment', `# Production Environment
- Frontend: Deployed via Lovable platform
- Backend: Supabase cloud infrastructure  
- Database: PostgreSQL with real-time features
- CDN: Global edge network for low latency
- Security: TLS 1.3, CORS policies, CSP headers

# Development Workflow
1. Local development with Vite dev server
2. Supabase CLI for database migrations
3. Edge function testing locally
4. Automated deployments via Git integration`);

      // Footer
      pdf.addPage();
      yPosition = margin;
      addTitle('Summary', 16);
      addText('This documentation covers the complete security and authentication system implemented in your application. The system provides enterprise-grade security features including brute force protection, session management, password policies, and comprehensive audit logging.', 12);
      
      addText('For questions or support, refer to the Supabase documentation or contact your development team.', 12);
      
      addText(`Generated on: ${new Date().toLocaleDateString()}`, 10);
      
      // Save the PDF
      pdf.save('complete-system-documentation.pdf');
      
      toast({
        title: "Complete PDF exported successfully",
        description: "Full documentation with all tabs has been downloaded as PDF.",
      });
    } catch (error) {
      console.error('PDF export failed:', error);
      toast({
        title: "Export failed",
        description: "There was an error exporting the PDF.",
        variant: "destructive",
      });
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied to clipboard",
        description: "Content has been copied to your clipboard.",
      });
    } catch (err) {
      console.error('Failed to copy: ', err);
    }
  };

  const CodeBlock = ({ title, children }: { title: string; children: string }) => (
    <Card className="mb-4">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => copyToClipboard(children)}
          >
            Copy
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
          <code>{children}</code>
        </pre>
      </CardContent>
    </Card>
  );

  return (
    <Dialog>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-6xl h-[80vh]">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="flex items-center gap-2">
              <FileText className="h-5 w-5" />
              Login Page Documentation
            </DialogTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={exportToPDF}
              className="flex items-center gap-2"
            >
              <FileText className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </DialogHeader>
        
        <ScrollArea className="h-full">
          <Tabs defaultValue="security" className="w-full">
            <TabsList className="grid w-full grid-cols-6">
              <TabsTrigger value="security">Security</TabsTrigger>
              <TabsTrigger value="database">Database</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
              <TabsTrigger value="auth">Authentication</TabsTrigger>
              <TabsTrigger value="apis">APIs</TabsTrigger>
              <TabsTrigger value="architecture">Architecture</TabsTrigger>
            </TabsList>

            <TabsContent value="security" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Shield className="h-5 w-5 text-green-500" />
                    Enhanced Security System
                  </CardTitle>
                  <CardDescription>
                    Comprehensive security features protecting your application
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Active Security Features:</h4>
                      <div className="space-y-1">
                        <Badge variant="outline" className="text-green-600">
                          ✅ Password complexity enforcement
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          ✅ Brute force attack protection
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          ✅ Session security management
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          ✅ Real-time security monitoring
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          ✅ Configurable lockout policies
                        </Badge>
                        <Badge variant="outline" className="text-green-600">
                          ✅ Enhanced login flow with security alerts
                        </Badge>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <h4 className="font-semibold text-sm">Security Configuration:</h4>
                      <div className="text-sm space-y-1 text-muted-foreground">
                        <p>• Maximum failed login attempts: 5</p>
                        <p>• Account lockout duration: 30 minutes</p>
                        <p>• Session timeout: 24 hours</p>
                        <p>• Password minimum length: 8 characters</p>
                        <p>• Special characters required: Yes</p>
                        <p>• Real-time session monitoring: Active</p>
                      </div>
                    </div>
                  </div>

                  <CodeBlock title="Security Settings Function">
{`-- Database function for security settings
CREATE OR REPLACE FUNCTION get_security_settings()
RETURNS TABLE(
  max_login_attempts integer,
  session_timeout_hours integer,
  require_2fa boolean,
  password_min_length integer,
  require_special_chars boolean,
  lockout_duration integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  settings_data JSONB;
BEGIN
  SELECT setting_value INTO settings_data
  FROM system_settings WHERE setting_key = 'security';
  
  RETURN QUERY SELECT 
    COALESCE((settings_data->>'maxFailedLogins')::INTEGER, 5),
    COALESCE((settings_data->>'sessionTimeout')::INTEGER, 24),
    COALESCE((settings_data->>'twoFactorRequired')::BOOLEAN, false),
    COALESCE((settings_data->>'passwordMinLength')::INTEGER, 8),
    COALESCE((settings_data->>'passwordRequireSpecialChars')::BOOLEAN, true),
    COALESCE((settings_data->>'lockoutDuration')::INTEGER, 30);
END;
$$;`}
                  </CodeBlock>

                  <CodeBlock title="Enhanced Security Hook Usage">
{`// Frontend security integration
const {
  isSessionValid,
  securityStatus,
  performSecureLogin,
  validatePassword,
  checkBanStatus
} = useEnhancedSecurity();

// Secure login with enhanced validation
const result = await performSecureLogin(
  email,
  password,
  clientIP,
  userAgent
);`}
                  </CodeBlock>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="database" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Database className="h-5 w-5 text-blue-500" />
                    Database Schema Overview
                  </CardTitle>
                  <CardDescription>
                    Core tables and security-related schema
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Security Tables:</h4>
                      <div className="space-y-1 text-sm">
                        <Badge variant="secondary">user_security_status</Badge>
                        <Badge variant="secondary">user_login_attempts</Badge>
                        <Badge variant="secondary">user_sessions</Badge>
                        <Badge variant="secondary">system_settings</Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Core Application Tables:</h4>
                      <div className="space-y-1 text-sm">
                        <Badge variant="secondary">agents</Badge>
                        <Badge variant="secondary">chat_conversations</Badge>
                        <Badge variant="secondary">audit_logs</Badge>
                        <Badge variant="secondary">api_keys</Badge>
                      </div>
                    </div>
                  </div>

                  <CodeBlock title="User Security Status Table">
{`-- Table structure for tracking user security
CREATE TABLE user_security_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  email text NOT NULL,
  failed_login_count integer DEFAULT 0,
  last_successful_login timestamptz,
  last_failed_login timestamptz,
  is_banned boolean DEFAULT false,
  ban_reason text,
  banned_at timestamptz,
  banned_until timestamptz,
  session_expires_at timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`}
                  </CodeBlock>

                  <CodeBlock title="User Sessions Table">
{`-- Active session tracking
CREATE TABLE user_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id),
  session_id text,
  ip_address inet,
  user_agent text,
  device_type text,
  browser text,
  os text,
  location text,
  is_active boolean DEFAULT true,
  session_start timestamptz DEFAULT now(),
  last_activity timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);`}
                  </CodeBlock>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="sessions" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Clock className="h-5 w-5 text-purple-500" />
                    Session Management System
                  </CardTitle>
                  <CardDescription>
                    How sessions are created, tracked, and invalidated
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Session Lifecycle:</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">1</Badge>
                          <span>User authenticates via enhanced login</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">2</Badge>
                          <span>Session created with device fingerprinting</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">3</Badge>
                          <span>Periodic session validation (every 5 minutes)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Badge variant="outline">4</Badge>
                          <span>Automatic cleanup of expired sessions</span>
                        </div>
                      </div>
                    </div>

                    <CodeBlock title="Session Creation Process">
{`// Session management edge function
export default async function handler(req: Request) {
  const { action, user_id, ip_address, user_agent } = await req.json();
  
  switch (action) {
    case 'create':
      // Create new session with device fingerprinting
      const sessionId = await createUserSession({
        user_id,
        ip_address,
        user_agent,
        device_type: parseDeviceType(user_agent),
        location: await getLocationFromIP(ip_address)
      });
      return new Response(JSON.stringify({ session_id: sessionId }));
      
    case 'heartbeat':
      // Update session activity
      await updateSessionActivity(session_id);
      return new Response(JSON.stringify({ success: true }));
      
    case 'revoke':
      // Invalidate specific session
      await revokeSession(session_id);
      return new Response(JSON.stringify({ success: true }));
  }
}`}
                    </CodeBlock>

                    <CodeBlock title="Frontend Session Monitoring">
{`// Automatic session validation
useEffect(() => {
  const checkSession = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      const isValid = await checkSessionValidity(user.id);
      if (!isValid) {
        await supabase.auth.signOut();
      }
    }
  };

  // Check every 5 minutes
  const interval = setInterval(checkSession, 5 * 60 * 1000);
  return () => clearInterval(interval);
}, []);`}
                    </CodeBlock>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="auth" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Lock className="h-5 w-5 text-orange-500" />
                    Authentication Flow
                  </CardTitle>
                  <CardDescription>
                    Enhanced authentication with security validation
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <CodeBlock title="Enhanced Login Function (Edge Function)">
{`export default async function handler(req: Request) {
  const { email, password, ip_address, user_agent } = await req.json();
  
  // Check if user is banned or locked out
  const banStatus = await checkUserBanStatus(email);
  if (banStatus.is_banned) {
    return errorResponse('Account temporarily locked', {
      ban_reason: banStatus.ban_reason,
      locked_until: banStatus.banned_until
    });
  }
  
  // Attempt authentication
  const { data, error } = await supabaseAdmin.auth.signInWithPassword({
    email,
    password
  });
  
  if (error) {
    // Track failed attempt
    await trackLoginAttempt(email, false, ip_address, user_agent);
    return errorResponse('Invalid credentials');
  }
  
  // Track successful login
  await trackLoginAttempt(email, true, ip_address, user_agent, data.user.id);
  
  // Create session
  await createUserSession(data.user.id, ip_address, user_agent);
  
  return successResponse({ user: data.user, session: data.session });
}`}
                  </CodeBlock>

                  <CodeBlock title="Password Validation">
{`// Frontend password validation
const validatePassword = async (password: string) => {
  const { data } = await supabase.functions.invoke('auth-security-enhanced', {
    body: { action: 'validate_password', password }
  });
  
  return data.validation; // { valid: boolean, errors: string[] }
};

// Usage in forms
const handlePasswordChange = async (password: string) => {
  const validation = await validatePassword(password);
  if (!validation.valid) {
    setErrors(validation.errors);
  }
};`}
                  </CodeBlock>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="apis" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Key className="h-5 w-5 text-yellow-500" />
                    API Security & Rate Limiting
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="text-sm">Show sensitive information:</span>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setShowSensitiveInfo(!showSensitiveInfo)}
                    >
                      {showSensitiveInfo ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </Button>
                  </div>

                  <CodeBlock title="API Key Management">
{showSensitiveInfo ? `-- Generate secure API key
CREATE OR REPLACE FUNCTION generate_api_key(
  _customer_id uuid,
  _name text,
  _permissions text[] DEFAULT ARRAY['read']
) RETURNS TABLE(id uuid, api_key text, key_prefix text)
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE
  _key_id UUID;
  _api_key TEXT;
  _key_hash TEXT;
BEGIN
  -- Generate secure key
  _api_key := 'sk-' || encode(gen_random_bytes(32), 'hex');
  _key_hash := encode(digest(_api_key, 'sha256'), 'hex');
  
  INSERT INTO api_keys (customer_id, name, key_hash, permissions)
  VALUES (_customer_id, _name, _key_hash, _permissions)
  RETURNING id INTO _key_id;
  
  RETURN QUERY SELECT _key_id, _api_key, substring(_api_key, 1, 12);
END;
$$;` : '// [Hidden] Click the eye icon to view sensitive API code'}
                  </CodeBlock>

                  <CodeBlock title="Rate Limiting Implementation">
{`-- Rate limiting function
CREATE OR REPLACE FUNCTION check_and_increment_rate_limit(
  _team_id uuid,
  _user_id uuid,
  _limit_type text,
  _max_count integer,
  _window_hours integer DEFAULT 24
) RETURNS TABLE(
  allowed boolean,
  current_count integer,
  retry_after_seconds integer
) LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  -- Implementation of sliding window rate limiting
  -- Tracks usage per team/user/limit type combination
END;
$$;`}
                  </CodeBlock>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="architecture" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5 text-teal-500" />
                    System Architecture
                  </CardTitle>
                  <CardDescription>
                    Technology stack and architectural overview
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-3 gap-4">
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Frontend Stack:</h4>
                      <div className="space-y-1 text-sm">
                        <Badge>React 18</Badge>
                        <Badge>TypeScript</Badge>
                        <Badge>Tailwind CSS</Badge>
                        <Badge>Vite</Badge>
                        <Badge>Supabase Client</Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Backend Stack:</h4>
                      <div className="space-y-1 text-sm">
                        <Badge>Supabase</Badge>
                        <Badge>PostgreSQL</Badge>
                        <Badge>Edge Functions (Deno)</Badge>
                        <Badge>Row Level Security</Badge>
                        <Badge>Real-time Subscriptions</Badge>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-semibold text-sm mb-2">Security Features:</h4>
                      <div className="space-y-1 text-sm">
                        <Badge>JWT Authentication</Badge>
                        <Badge>RLS Policies</Badge>
                        <Badge>API Rate Limiting</Badge>
                        <Badge>Session Management</Badge>
                        <Badge>Audit Logging</Badge>
                      </div>
                    </div>
                  </div>

                  <CodeBlock title="Project Structure">
{`src/
├── components/
│   ├── ui/                 # Shadcn/ui components
│   ├── dashboard/          # Dashboard-specific components
│   ├── auth/              # Authentication components
│   └── security/          # Security features
├── hooks/
│   ├── useEnhancedSecurity.tsx    # Security hook
│   ├── useSecurityEnforcement.tsx # Security enforcement
│   └── useDateRangeFilter.tsx     # Dashboard filtering
├── pages/
│   ├── Auth.tsx           # Login/register pages
│   ├── Dashboard.tsx      # Main dashboard
│   └── SecuritySettings.tsx # Security configuration
├── contexts/
│   └── AuthContext.tsx    # Global auth state
supabase/
├── functions/
│   ├── auth-security-enhanced/    # Enhanced auth
│   └── session-management/        # Session handling
└── migrations/            # Database schema changes`}
                  </CodeBlock>

                  <CodeBlock title="Environment & Deployment">
{`# Production Environment
- Frontend: Deployed via Lovable platform
- Backend: Supabase cloud infrastructure  
- Database: PostgreSQL with real-time features
- CDN: Global edge network for low latency
- Security: TLS 1.3, CORS policies, CSP headers

# Development Workflow
1. Local development with Vite dev server
2. Supabase CLI for database migrations
3. Edge function testing locally
4. Automated deployments via Git integration`}
                  </CodeBlock>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
}