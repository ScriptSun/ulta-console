/**
 * Feature flags for the application
 */
export const FEATURE_FLAGS = {
  readFromTeams: false,
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}