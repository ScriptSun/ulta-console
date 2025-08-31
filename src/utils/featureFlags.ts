/**
 * Feature flags for the application
 * 
 * readFromTeams: When false, the app ignores console_team_members data and uses
 * only user-based permissions. This allows the app to work identically with or
 * without team data while keeping the database tables intact.
 */
export const FEATURE_FLAGS = {
  readFromTeams: false, // Set to false to disable team-based functionality
} as const;

export type FeatureFlag = keyof typeof FEATURE_FLAGS;

export function isFeatureEnabled(flag: FeatureFlag): boolean {
  return FEATURE_FLAGS[flag];
}