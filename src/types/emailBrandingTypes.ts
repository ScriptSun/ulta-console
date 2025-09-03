export type EmailBrandingSpec = {
  id?: string;
  senderName: string;
  senderEmail: string;
  colors: { 
    headerBg: string; 
    text: string; 
    accent: string; 
    useTheme: boolean;
  };
  spf: { 
    status: "ok" | "pending" | "missing"; 
    record: string;
  };
  dkim: { 
    status: "ok" | "pending" | "missing"; 
    selector: string; 
    host: string; 
    record: string;
  };
  updatedAt: string;
  customerId?: string;
};

export type EmailTemplate = {
  id: string;
  name: string; // Forgot Password, Welcome, etc.
  slug: string; // forgot-password, welcome, system-update, agent-notification, generic
  subject: string;
  preheader?: string;
  category: "transactional" | "marketing";
  colors: { 
    headerBg?: string; 
    text?: string; 
    accent?: string; 
    useTheme: boolean;
  };
  mjml: string;
  variables: Record<string, { required: boolean; example?: string }>;
  version: number;
  updatedAt: string;
  updatedBy: { id: string; name: string };
  customerId?: string;
  status?: "active" | "archived";
};

export type EmailTemplateVersion = {
  id: string;
  templateId: string;
  version: number;
  subject: string;
  preheader?: string;
  category: "transactional" | "marketing";
  colors: {
    headerBg?: string;
    text?: string;
    accent?: string;
    useTheme: boolean;
  };
  mjml: string;
  variables: Record<string, { required: boolean; example?: string }>;
  createdAt: string;
  createdBy: { id: string; name: string };
};

export type EmailTemplateRenderResult = {
  html: string;
  warnings: string[];
};

export type EmailTestSendRequest = {
  to: string;
  data: Record<string, any>;
};

export type EmailTestSendResult = {
  ok: boolean;
  message?: string;
};