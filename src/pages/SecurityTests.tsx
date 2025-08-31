import React from 'react';
import { RLSTestRunner } from '@/components/tests/RLSTestRunner';
import { Shield, Database, Lock } from 'lucide-react';

export default function SecurityTests() {
  return (
    <div className="container mx-auto py-8 space-y-8 max-w-6xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <div className="p-3 rounded-lg bg-primary/10">
          <Shield className="h-8 w-8 text-primary" />
        </div>
        <div>
          <h1 className="text-3xl font-bold">Security Tests</h1>
          <p className="text-muted-foreground">
            Verify Row-Level Security policies and team isolation
          </p>
        </div>
      </div>

      {/* Security Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <Database className="h-5 w-5 text-blue-500" />
            <h3 className="font-semibold">Team Isolation</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Members can only access data from their own teams. Cross-team data access is completely blocked.
          </p>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <Lock className="h-5 w-5 text-green-500" />
            <h3 className="font-semibold">Permission Control</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            Only Owners and Admins can modify permissions. Regular members have read-only access to their own data.
          </p>
        </div>

        <div className="p-6 rounded-lg border bg-card">
          <div className="flex items-center gap-3 mb-3">
            <Shield className="h-5 w-5 text-purple-500" />
            <h3 className="font-semibold">Profile Security</h3>
          </div>
          <p className="text-sm text-muted-foreground">
            User profiles are only visible to the owner and team Owners/Admins. No cross-team profile access.
          </p>
        </div>
      </div>

      {/* Test Runner */}
      <RLSTestRunner />

      {/* Additional Info */}
      <div className="p-6 rounded-lg border bg-muted/50">
        <h3 className="font-semibold mb-3 flex items-center gap-2">
          <Database className="h-5 w-5" />
          Protected Tables
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
          <div>
            <h4 className="font-medium mb-2">Core Tables:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• admin_profiles - User profile data</li>
              <li>• console_team_members - Team memberships</li>
              <li>• console_member_page_perms - Page permissions</li>
              <li>• console_member_widget_scopes - Widget access</li>
            </ul>
          </div>
          <div>
            <h4 className="font-medium mb-2">Protection Features:</h4>
            <ul className="space-y-1 text-muted-foreground">
              <li>• Row-Level Security (RLS) enabled</li>
              <li>• Team-based access control</li>
              <li>• Role-based write permissions</li>
              <li>• Complete data isolation</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}