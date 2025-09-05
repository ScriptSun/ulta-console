export type EventKey = string; // use keys from GET /api/notify/events

export type EmailTemplate = {
  id: string;
  key: string; // usually the event key, example "api.key.created"
  name: string;
  category: "security" | "account" | "agents" | "billing" | "system";
  locale: string; // "en", "ar", etc.
  status: "active" | "draft" | "archived";
  subject: string;
  preheader?: string;
  html: string;
  text?: string;
  variables: string[]; // auto extracted {{tokens}}
  provider?: { 
    sendgridTemplateId?: string; 
    postmarkTemplateId?: string; 
    mailgunTemplate?: string; 
  };
  updatedAt: string;
  version: number;
  createdBy?: { id: string; name: string };
  customerId?: string;
};

export type EventRule = {
  key: EventKey;
  category: EmailTemplate["category"];
  severity: "critical" | "warning" | "info";
  channels: Partial<Record<"email"|"telegram"|"slack"|"discord"|"sms"|"webhook"|"inapp", boolean>>;
  emailTemplateId?: string; // required if channels.email is true
};

export type NotificationPolicy = {
  version: number;
  updatedAt: string;
  rules: EventRule[];
};

export type EventInfo = {
  key: EventKey;
  name: string;
  category: string;
  defaultLocale: string;
};

// Available template variables
export const TEMPLATE_VARIABLES = {
  'org.name': 'Organization name',
  'org.url': 'Organization URL',
  'user.name': 'User name',
  'user.email': 'User email',
  'event.time': 'Event timestamp',
  'action.url': 'Action URL',
  'agent.name': 'Agent name',
  'api.key.prefix': 'API key prefix',
  'invoice.id': 'Invoice ID',
  'invoice.amount': 'Invoice amount',
  'security.banCount': 'Security ban count',
  'security.window': 'Security time window',
  'assets.emailLogo': 'Email logo URL',
  'year': 'Current year'
};

// HTML skeleton for all templates
export const HTML_SKELETON = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#ffffff">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 0;text-align:center">
<img src="{{assets.emailLogo}}" alt="{{org.name}}" height="40">
</td></tr>
<tr><td style="padding:16px 24px;color:#0f172a;font:16px/24px Inter,Arial">
{{content}}
</td></tr>
<tr><td style="padding:24px;color:#64748b;font:12px/18px Inter,Arial;text-align:center">
© {{year}} {{org.name}} · <a href="{{org.url}}/settings/notifications">Notification settings</a>
</td></tr>
</table>
</td></tr>
</table>`;

// Default template content for seeding
export const DEFAULT_TEMPLATES: Record<string, { subject: string; htmlContent: string }> = {
  "api.key.created": {
    subject: "Your API key was created",
    htmlContent: "<h1>API key created</h1><p>Hello {{user.name}}, an API key ending with {{api.key.prefix}} was created at {{event.time}}.</p><p><a href='{{org.url}}/settings/api-keys'>Manage API keys</a></p>"
  },
  "agent.created": {
    subject: "New agent created", 
    htmlContent: "<h1>Agent created</h1><p>Agent <b>{{agent.name}}</b> was created by {{user.name}} at {{event.time}}.</p><p><a href='{{org.url}}/agents'>Open agents</a></p>"
  },
  "security.login.bans.threshold": {
    subject: "Login bans threshold reached",
    htmlContent: "<h1>Security alert</h1><p>{{security.banCount}} bans in {{security.window}} minutes.</p><p><a href='{{org.url}}/security'>Review security events</a></p>"
  },
  "billing.invoice.created": {
    subject: "New invoice available",
    htmlContent: "<h1>Invoice {{invoice.id}}</h1><p>A new invoice for {{invoice.amount}} is available.</p><p><a href='{{org.url}}/billing'>View invoice</a></p>"
  },
  "user.created": {
    subject: "Welcome to {{org.name}}",
    htmlContent: "<h1>Welcome {{user.name}}</h1><p>Your account has been created successfully.</p><p><a href='{{org.url}}/dashboard'>Get started</a></p>"
  },
  "agent.heartbeat.lost": {
    subject: "Agent {{agent.name}} offline", 
    htmlContent: "<h1>Agent offline</h1><p>Agent <b>{{agent.name}}</b> has not sent a heartbeat since {{event.time}}.</p><p><a href='{{org.url}}/agents'>Check agent status</a></p>"
  },
  "system.maintenance.scheduled": {
    subject: "Scheduled maintenance",
    htmlContent: "<h1>Maintenance scheduled</h1><p>System maintenance is scheduled at {{event.time}}.</p><p><a href='{{org.url}}/status'>View status page</a></p>"
  },
  "security.suspicious.activity": {
    subject: "Suspicious activity detected",
    htmlContent: "<h1>Security alert</h1><p>Suspicious activity detected at {{event.time}}.</p><p><a href='{{org.url}}/security'>Review security events</a></p>"
  }
};