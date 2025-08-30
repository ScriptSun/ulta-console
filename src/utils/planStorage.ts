import { Plan, CreatePlanRequest, UpdatePlanRequest, BillingPeriod } from '@/types/planTypes';

/**
 * Local storage key for persisting subscription plans
 * This will be replaced by database storage when the backend API is implemented
 */
const STORAGE_KEY = 'company_subscription_plans';

/**
 * Predefined seed plans that are automatically created on first application load
 * These represent common subscription tiers for SaaS businesses
 * Future API: These will be inserted via POST /api/plans/seed endpoint
 */
const SEED_PLANS: Omit<Plan, 'id' | 'createdAt' | 'updatedAt'>[] = [
  {
    name: 'Free',
    key: 'free_plan',
    slug: 'free',
    description: 'Perfect for getting started with basic features',
    version: 1,
    enabled: true,
    allowedBillingPeriods: ['monthly'],
    limits: {
      ai_requests: 25,
      server_events: 25
    },
    features: ['Community access'],
    supportLevel: 'community',
    analyticsLevel: 'basic'
  },
  {
    name: 'Basic',
    key: 'basic_plan',
    slug: 'basic',
    description: 'Ideal for small teams and growing projects',
    version: 1,
    enabled: true,
    allowedBillingPeriods: ['monthly', '1year'],
    limits: {
      ai_requests: 70,
      server_events: 70
    },
    features: ['Email support'],
    supportLevel: 'basic',
    analyticsLevel: 'basic'
  },
  {
    name: 'Pro',
    key: 'pro_plan',
    slug: 'pro',
    description: 'Best for professional teams and advanced workflows',
    version: 1,
    enabled: true,
    allowedBillingPeriods: ['monthly', '3months', '1year'],
    limits: {
      ai_requests: 125,
      server_events: 125
    },
    features: ['Priority support', 'Custom integrations'],
    supportLevel: 'priority',
    analyticsLevel: 'advanced'
  },
  {
    name: 'Premium',
    key: 'premium_plan',
    slug: 'premium',
    description: 'For enterprise-level requirements and maximum flexibility',
    version: 1,
    enabled: true,
    allowedBillingPeriods: ['monthly', '6months', '1year', '2years', '3years'],
    limits: {
      ai_requests: 200,
      server_events: 200
    },
    features: ['Dedicated support', 'Advanced analytics'],
    supportLevel: 'dedicated',
    analyticsLevel: 'advanced'
  }
];

/**
 * Safely reads plan data from localStorage with error handling
 * Future API: Will be replaced by GET /api/plans endpoint
 * @returns Array of Plan objects or empty array if error/not found
 */
const getStorageData = (): Plan[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error reading plans from localStorage:', error);
    return [];
  }
};

/**
 * Safely writes plan data to localStorage with error handling
 * Future API: Individual operations will call respective API endpoints
 * @param plans - Array of Plan objects to persist
 */
const setStorageData = (plans: Plan[]): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
  } catch (error) {
    console.error('Error writing plans to localStorage:', error);
  }
};

/**
 * Generates a unique plan ID for new plans
 * Future API: Will be replaced by database auto-generated UUIDs
 * @returns Unique string identifier for a plan
 */
const generatePlanId = (): string => {
  return `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
};

/**
 * Creates seed plans if no plans exist in storage
 * This ensures new installations have example plans to work with
 * Future API: Will be called via POST /api/plans/seed on first backend initialization
 */
const createSeedPlansIfEmpty = (): void => {
  const existingPlans = getStorageData();
  
  if (existingPlans.length === 0) {
    const now = new Date().toISOString();
    const seedPlans: Plan[] = SEED_PLANS.map(seedPlan => ({
      ...seedPlan,
      id: generatePlanId(),
      createdAt: now,
      updatedAt: now
    }));
    
    setStorageData(seedPlans);
    console.log('Created seed plans:', seedPlans.length);
  }
};

export const planStorage = {
  /**
   * Retrieves all subscription plans for the company
   * Automatically creates seed plans on first load if none exist
   * Future API: GET /api/plans - Returns paginated list of plans with filters
   * @returns Array of all Plan objects
   */
  getPlans: (): Plan[] => {
    createSeedPlansIfEmpty();
    return getStorageData();
  },

  /**
   * Creates a new subscription plan
   * Validates slug uniqueness and required fields before creation
   * Future API: POST /api/plans - Creates plan and returns created object with ID
   * @param request - Plan creation data without ID/timestamps
   * @returns Newly created Plan object
   * @throws Error if slug already exists or validation fails
   */
  createPlan: (request: CreatePlanRequest): Plan => {
    const plans = getStorageData();
    
    // Check for key and slug uniqueness across all plans
    const existingKey = plans.find(p => p.key === request.key);
    if (existingKey) {
      throw new Error(`Plan with key "${request.key}" already exists`);
    }
    
    const existingSlug = plans.find(p => p.slug === request.slug);
    if (existingSlug) {
      throw new Error(`Plan with slug "${request.slug}" already exists`);
    }

    const newPlan: Plan = {
      id: generatePlanId(),
      ...request,
      version: 1,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedPlans = [...plans, newPlan];
    setStorageData(updatedPlans);
    return newPlan;
  },

  /**
   * Updates an existing subscription plan
   * Automatically increments version if business-critical fields change
   * Future API: PUT /api/plans/{id} - Updates plan and returns updated object
   * @param request - Plan update data including ID
   * @returns Updated Plan object
   * @throws Error if plan not found or slug conflict exists
   */
  updatePlan: (request: UpdatePlanRequest): Plan => {
    const plans = getStorageData();
    
    const planIndex = plans.findIndex(p => p.id === request.id);
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }

    const existingPlan = plans[planIndex];
    
    // Check for key and slug uniqueness (excluding current plan)
    if (request.key && request.key !== existingPlan.key) {
      const duplicateKey = plans.find(p => p.key === request.key && p.id !== request.id);
      if (duplicateKey) {
        throw new Error(`Plan with key "${request.key}" already exists`);
      }
    }
    
    if (request.slug && request.slug !== existingPlan.slug) {
      const duplicateSlug = plans.find(p => p.slug === request.slug && p.id !== request.id);
      if (duplicateSlug) {
        throw new Error(`Plan with slug "${request.slug}" already exists`);
      }
    }

    // Determine if version should increment based on business-critical changes
    // These fields affect billing and customer entitlements
    const shouldIncrementVersion = 
      (request.limits && JSON.stringify(request.limits) !== JSON.stringify(existingPlan.limits)) ||
      (request.allowedBillingPeriods && JSON.stringify(request.allowedBillingPeriods) !== JSON.stringify(existingPlan.allowedBillingPeriods)) ||
      (request.features && JSON.stringify(request.features) !== JSON.stringify(existingPlan.features)) ||
      (request.supportLevel && request.supportLevel !== existingPlan.supportLevel) ||
      (request.analyticsLevel && request.analyticsLevel !== existingPlan.analyticsLevel);

    const updatedPlan: Plan = {
      ...existingPlan,
      ...request,
      version: shouldIncrementVersion ? existingPlan.version + 1 : existingPlan.version,
      updatedAt: new Date().toISOString(),
    };

    plans[planIndex] = updatedPlan;
    setStorageData(plans);
    return updatedPlan;
  },

  /**
   * Creates a duplicate of an existing plan with new name and slug
   * Useful for creating plan variants or testing new configurations
   * Future API: POST /api/plans/{id}/duplicate - Creates copy and returns new plan
   * @param planId - ID of plan to duplicate
   * @param newName - Name for the duplicated plan
   * @param newSlug - Slug for the duplicated plan (must be unique)
   * @returns Newly created Plan object (duplicate)
   * @throws Error if original plan not found or slug conflict exists
   */
  duplicatePlan: (planId: string, newName: string, newKey: string, newSlug: string): Plan => {
    const plans = getStorageData();
    
    const originalPlan = plans.find(p => p.id === planId);
    if (!originalPlan) {
      throw new Error('Plan not found');
    }

    // Check for key and slug uniqueness
    const existingKey = plans.find(p => p.key === newKey);
    if (existingKey) {
      throw new Error(`Plan with key "${newKey}" already exists`);
    }
    
    const existingSlug = plans.find(p => p.slug === newSlug);
    if (existingSlug) {
      throw new Error(`Plan with slug "${newSlug}" already exists`);
    }

    const duplicatedPlan: Plan = {
      ...originalPlan,
      id: generatePlanId(),
      name: newName,
      key: newKey,
      slug: newSlug,
      version: 1, // Reset version for new plan
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const updatedPlans = [...plans, duplicatedPlan];
    setStorageData(updatedPlans);
    return duplicatedPlan;
  },

  /**
   * Permanently deletes a subscription plan
   * Warning: This will affect any active subscriptions using this plan
   * Future API: DELETE /api/plans/{id} - Soft deletes plan and handles subscription migration
   * @param planId - ID of plan to delete
   * @throws Error if plan not found
   */
  deletePlan: (planId: string): void => {
    const plans = getStorageData();
    const updatedPlans = plans.filter(p => p.id !== planId);
    
    if (updatedPlans.length === plans.length) {
      throw new Error('Plan not found');
    }
    
    setStorageData(updatedPlans);
  },

  /**
   * Toggles the enabled status of a subscription plan
   * Disabled plans cannot be selected for new subscriptions but existing ones continue
   * Future API: PATCH /api/plans/{id}/status - Updates status and handles subscription logic
   * @param planId - ID of plan to toggle
   * @returns Updated Plan object with new status
   * @throws Error if plan not found
   */
  togglePlanStatus: (planId: string): Plan => {
    const plans = getStorageData();
    
    const planIndex = plans.findIndex(p => p.id === planId);
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }

    const updatedPlan = {
      ...plans[planIndex],
      enabled: !plans[planIndex].enabled,
      updatedAt: new Date().toISOString(),
    };

    plans[planIndex] = updatedPlan;
    setStorageData(plans);
    return updatedPlan;
  },

  /**
   * Validates plan data for creation or update operations
   * Ensures all required fields are present and properly formatted
   * Future API: Will be handled server-side with comprehensive validation
   * @param plan - Partial plan data to validate
   * @returns Array of validation error messages (empty if valid)
   */
  validatePlan: (plan: Partial<CreatePlanRequest | UpdatePlanRequest>): string[] => {
    const errors: string[] = [];

    if (!plan.name?.trim()) {
      errors.push('Plan name is required');
    }

    if (!plan.key?.trim()) {
      errors.push('Plan key is required');
    } else if (!/^[a-z0-9_]+$/.test(plan.key)) {
      errors.push('Plan key must contain only lowercase letters, numbers, and underscores');
    }

    if (!plan.slug?.trim()) {
      errors.push('Plan slug is required');
    } else if (!/^[a-z0-9-]+$/.test(plan.slug)) {
      errors.push('Plan slug must contain only lowercase letters, numbers, and hyphens');
    }

    if (!plan.limits?.ai_requests || plan.limits.ai_requests <= 0) {
      errors.push('AI requests limit must be greater than 0');
    }

    if (!plan.limits?.server_events || plan.limits.server_events <= 0) {
      errors.push('Server events limit must be greater than 0');
    }

    if (!plan.allowedBillingPeriods?.length) {
      errors.push('At least one billing period is required');
    }

    return errors;
  },

  /**
   * Retrieves a single plan by its ID
   * Future API: GET /api/plans/{id} - Returns single plan or 404
   * @param planId - ID of plan to retrieve
   * @returns Plan object or null if not found
   */
  getPlanById: (planId: string): Plan | null => {
    const plans = getStorageData();
    return plans.find(p => p.id === planId) || null;
  },

  /**
   * Retrieves a single plan by its slug (for public-facing URLs)
   * Future API: GET /api/plans/by-slug/{slug} - Returns plan for public pricing pages
   * @param slug - Slug of plan to retrieve
   * @returns Plan object or null if not found
   */
  getPlanBySlug: (slug: string): Plan | null => {
    const plans = getStorageData();
    return plans.find(p => p.slug === slug) || null;
  },

  /**
   * Gets all enabled plans (available for new subscriptions)
   * Future API: GET /api/plans/enabled - Returns only plans available for purchase
   * @returns Array of enabled Plan objects
   */
  getEnabledPlans: (): Plan[] => {
    const plans = getStorageData();
    return plans.filter(p => p.enabled);
  },

  /**
   * Manually triggers creation of seed plans (for testing/reset purposes)
   * Future API: POST /api/plans/seed - Admin endpoint to reset to default plans
   */
  createSeedPlans: (): void => {
    const now = new Date().toISOString();
    const seedPlans: Plan[] = SEED_PLANS.map(seedPlan => ({
      ...seedPlan,
      id: generatePlanId(),
      createdAt: now,
      updatedAt: now
    }));
    
    setStorageData(seedPlans);
  },

  /**
   * Clears all plans (for testing purposes)
   * Future API: DELETE /api/plans/all - Admin endpoint with proper safeguards
   */
  clearAllPlans: (): void => {
    setStorageData([]);
  }
};