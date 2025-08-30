export type BillingPeriod = 'monthly' | '3months' | '6months' | '1year' | '2years' | '3years';

export type SupportLevel = 'community' | 'basic' | 'priority' | 'dedicated';

export type AnalyticsLevel = 'basic' | 'advanced';

export interface PlanLimits {
  ai_requests: number;
  server_events: number;
}

export interface Plan {
  id: string;
  name: string;
  slug: string;
  description: string;
  version: number;
  enabled: boolean;
  allowedBillingPeriods: BillingPeriod[];
  limits: PlanLimits;
  features: string[];
  supportLevel: SupportLevel;
  analyticsLevel: AnalyticsLevel;
  createdAt: string;
  updatedAt: string;
}

export interface CreatePlanRequest {
  name: string;
  slug: string;
  description: string;
  allowedBillingPeriods: BillingPeriod[];
  limits: PlanLimits;
  features: string[];
  supportLevel: SupportLevel;
  analyticsLevel: AnalyticsLevel;
}

export interface UpdatePlanRequest extends Partial<CreatePlanRequest> {
  id: string;
  enabled?: boolean;
}

export const BILLING_PERIOD_LABELS = {
  monthly: 'Monthly',
  '3months': '3 Months',
  '6months': '6 Months',
  '1year': '1 Year',
  '2years': '2 Years',
  '3years': '3 Years'
} as const;

export const SUPPORT_LEVEL_LABELS = {
  community: 'Community',
  basic: 'Basic',
  priority: 'Priority',
  dedicated: 'Dedicated'
} as const;

export const ANALYTICS_LEVEL_LABELS = {
  basic: 'Basic',
  advanced: 'Advanced'
} as const;