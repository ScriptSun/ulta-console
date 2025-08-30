export type BillingInterval = 'monthly' | 'annual' | '36m';

export type SupportLevel = 'community' | 'email' | 'priority' | 'dedicated';

export type AnalyticsLevel = 'basic' | 'standard' | 'advanced' | 'premium';

export interface PlanLimits {
  ai_requests: number;
  server_events: number;
}

export interface Plan {
  id: string;
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  version: number;
  enabled: boolean;
  allowedBillingIntervals: BillingInterval[];
  limits: PlanLimits;
  features: string[];
  supportLevel: SupportLevel;
  analyticsLevel: AnalyticsLevel;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  tenantId: string;
  name: string;
  slug: string;
  description: string;
  allowedBillingIntervals: BillingInterval[];
  limits: PlanLimits;
  features: string[];
  supportLevel: SupportLevel;
  analyticsLevel: AnalyticsLevel;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  id: string;
  enabled?: boolean;
}

export const BILLING_INTERVAL_LABELS = {
  monthly: 'Monthly',
  annual: 'Annual',
  '36m': '36 Months'
} as const;

export const SUPPORT_LEVEL_LABELS = {
  community: 'Community',
  email: 'Email',
  priority: 'Priority',
  dedicated: 'Dedicated'
} as const;

export const ANALYTICS_LEVEL_LABELS = {
  basic: 'Basic',
  standard: 'Standard',
  advanced: 'Advanced',
  premium: 'Premium'
} as const;