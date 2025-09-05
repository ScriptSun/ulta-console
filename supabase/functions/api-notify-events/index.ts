import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { corsHeaders } from "../_shared/cors.ts";

// Available events in the system
const SYSTEM_EVENTS = [
  { key: "api.key.created", name: "API Key Created", category: "security", defaultLocale: "en" },
  { key: "api.key.deleted", name: "API Key Deleted", category: "security", defaultLocale: "en" },
  { key: "api.key.rotated", name: "API Key Rotated", category: "security", defaultLocale: "en" },
  
  { key: "agent.created", name: "Agent Created", category: "agents", defaultLocale: "en" },
  { key: "agent.deleted", name: "Agent Deleted", category: "agents", defaultLocale: "en" },
  { key: "agent.heartbeat.lost", name: "Agent Heartbeat Lost", category: "agents", defaultLocale: "en" },
  { key: "agent.updated", name: "Agent Updated", category: "agents", defaultLocale: "en" },
  { key: "agent.status.changed", name: "Agent Status Changed", category: "agents", defaultLocale: "en" },
  
  { key: "user.created", name: "User Account Created", category: "account", defaultLocale: "en" },
  { key: "user.login", name: "User Login", category: "account", defaultLocale: "en" },
  { key: "user.logout", name: "User Logout", category: "account", defaultLocale: "en" },
  { key: "user.password.changed", name: "Password Changed", category: "account", defaultLocale: "en" },
  { key: "user.profile.updated", name: "Profile Updated", category: "account", defaultLocale: "en" },
  
  { key: "security.login.failed", name: "Login Failed", category: "security", defaultLocale: "en" },
  { key: "security.login.bans.threshold", name: "Login Bans Threshold", category: "security", defaultLocale: "en" },
  { key: "security.suspicious.activity", name: "Suspicious Activity", category: "security", defaultLocale: "en" },
  { key: "security.2fa.enabled", name: "2FA Enabled", category: "security", defaultLocale: "en" },
  { key: "security.2fa.disabled", name: "2FA Disabled", category: "security", defaultLocale: "en" },
  
  { key: "billing.invoice.created", name: "Invoice Created", category: "billing", defaultLocale: "en" },
  { key: "billing.invoice.paid", name: "Invoice Paid", category: "billing", defaultLocale: "en" },
  { key: "billing.invoice.overdue", name: "Invoice Overdue", category: "billing", defaultLocale: "en" },
  { key: "billing.subscription.created", name: "Subscription Created", category: "billing", defaultLocale: "en" },
  { key: "billing.subscription.cancelled", name: "Subscription Cancelled", category: "billing", defaultLocale: "en" },
  { key: "billing.payment.failed", name: "Payment Failed", category: "billing", defaultLocale: "en" },
  
  { key: "system.maintenance.scheduled", name: "Maintenance Scheduled", category: "system", defaultLocale: "en" },
  { key: "system.maintenance.started", name: "Maintenance Started", category: "system", defaultLocale: "en" },
  { key: "system.maintenance.completed", name: "Maintenance Completed", category: "system", defaultLocale: "en" },
  { key: "system.backup.completed", name: "Backup Completed", category: "system", defaultLocale: "en" },
  { key: "system.backup.failed", name: "Backup Failed", category: "system", defaultLocale: "en" },
  { key: "system.error.threshold", name: "Error Threshold Reached", category: "system", defaultLocale: "en" },
];

const handler = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    
    if (req.method === 'GET' && url.pathname.endsWith('/api/notify/events')) {
      return new Response(JSON.stringify(SYSTEM_EVENTS), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    return new Response('Not Found', { status: 404, headers: corsHeaders });

  } catch (error) {
    console.error('Events API error:', error);
    return new Response(
      JSON.stringify({ error: error.message }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      }
    );
  }
};

serve(handler);