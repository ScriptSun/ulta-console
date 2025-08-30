import { Plan, CreatePlanRequest, UpdatePlanRequest } from '@/types/planTypes';

const STORAGE_KEY = 'tenant_plans';

interface StorageData {
  [tenantId: string]: Plan[];
}

const getStorageData = (): StorageData => {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return {};
  }
};

const setStorageData = (data: StorageData): void => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
};

export const planStorage = {
  getPlans: (tenantId: string): Plan[] => {
    const data = getStorageData();
    return data[tenantId] || [];
  },

  createPlan: (request: CreatePlanRequest): Plan => {
    const data = getStorageData();
    const tenantPlans = data[request.tenantId] || [];
    
    // Check for slug uniqueness within tenant
    const existingPlan = tenantPlans.find(p => p.slug === request.slug);
    if (existingPlan) {
      throw new Error(`Plan with slug "${request.slug}" already exists`);
    }

    const newPlan: Plan = {
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      ...request,
      version: 1,
      enabled: true,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data[request.tenantId] = [...tenantPlans, newPlan];
    setStorageData(data);
    return newPlan;
  },

  updatePlan: (request: UpdatePlanRequest): Plan => {
    const data = getStorageData();
    const tenantPlans = data[request.tenantId!] || [];
    
    const planIndex = tenantPlans.findIndex(p => p.id === request.id);
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }

    const existingPlan = tenantPlans[planIndex];
    
    // Check for slug uniqueness within tenant (excluding current plan)
    if (request.slug && request.slug !== existingPlan.slug) {
      const duplicateSlug = tenantPlans.find(p => p.slug === request.slug && p.id !== request.id);
      if (duplicateSlug) {
        throw new Error(`Plan with slug "${request.slug}" already exists`);
      }
    }

    // Determine if version should increment
    const shouldIncrementVersion = 
      (request.limits && JSON.stringify(request.limits) !== JSON.stringify(existingPlan.limits)) ||
      (request.allowedBillingIntervals && JSON.stringify(request.allowedBillingIntervals) !== JSON.stringify(existingPlan.allowedBillingIntervals)) ||
      (request.features && JSON.stringify(request.features) !== JSON.stringify(existingPlan.features)) ||
      (request.supportLevel && request.supportLevel !== existingPlan.supportLevel);

    const updatedPlan: Plan = {
      ...existingPlan,
      ...request,
      version: shouldIncrementVersion ? existingPlan.version + 1 : existingPlan.version,
      updatedAt: new Date().toISOString(),
    };

    tenantPlans[planIndex] = updatedPlan;
    data[request.tenantId!] = tenantPlans;
    setStorageData(data);
    return updatedPlan;
  },

  duplicatePlan: (planId: string, tenantId: string, newName: string, newSlug: string): Plan => {
    const data = getStorageData();
    const tenantPlans = data[tenantId] || [];
    
    const originalPlan = tenantPlans.find(p => p.id === planId);
    if (!originalPlan) {
      throw new Error('Plan not found');
    }

    // Check for slug uniqueness
    const existingPlan = tenantPlans.find(p => p.slug === newSlug);
    if (existingPlan) {
      throw new Error(`Plan with slug "${newSlug}" already exists`);
    }

    const duplicatedPlan: Plan = {
      ...originalPlan,
      id: `plan_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: newName,
      slug: newSlug,
      version: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    data[tenantId] = [...tenantPlans, duplicatedPlan];
    setStorageData(data);
    return duplicatedPlan;
  },

  deletePlan: (planId: string, tenantId: string): void => {
    const data = getStorageData();
    const tenantPlans = data[tenantId] || [];
    
    data[tenantId] = tenantPlans.filter(p => p.id !== planId);
    setStorageData(data);
  },

  togglePlanStatus: (planId: string, tenantId: string): Plan => {
    const data = getStorageData();
    const tenantPlans = data[tenantId] || [];
    
    const planIndex = tenantPlans.findIndex(p => p.id === planId);
    if (planIndex === -1) {
      throw new Error('Plan not found');
    }

    const updatedPlan = {
      ...tenantPlans[planIndex],
      enabled: !tenantPlans[planIndex].enabled,
      updatedAt: new Date().toISOString(),
    };

    tenantPlans[planIndex] = updatedPlan;
    data[tenantId] = tenantPlans;
    setStorageData(data);
    return updatedPlan;
  },

  validatePlan: (plan: Partial<CreatePlanRequest | UpdatePlanRequest>): string[] => {
    const errors: string[] = [];

    if (!plan.name?.trim()) {
      errors.push('Plan name is required');
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

    if (!plan.allowedBillingIntervals?.length) {
      errors.push('At least one billing interval is required');
    }

    return errors;
  }
};