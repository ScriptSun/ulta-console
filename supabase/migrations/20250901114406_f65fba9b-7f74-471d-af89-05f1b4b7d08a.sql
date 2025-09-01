-- Create report permissions system
-- First, create a table for available reports
CREATE TABLE IF NOT EXISTS console_reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT NOT NULL UNIQUE,
  label TEXT NOT NULL,
  category TEXT DEFAULT 'dashboard',
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Create report permissions table for role templates
CREATE TABLE IF NOT EXISTS console_role_report_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  role TEXT NOT NULL,
  report_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_configure BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(role, report_key)
);

-- Create individual member report permissions
CREATE TABLE IF NOT EXISTS console_member_report_perms (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  member_id UUID NOT NULL REFERENCES console_team_members(id) ON DELETE CASCADE,
  report_key TEXT NOT NULL,
  can_view BOOLEAN DEFAULT false,
  can_export BOOLEAN DEFAULT false,
  can_configure BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(member_id, report_key)
);

-- Insert available reports
INSERT INTO console_reports (key, label, category, description) VALUES
  ('dashboard-overview', 'Dashboard Overview', 'dashboard', 'Main dashboard with all widgets'),
  ('revenue-report', 'Revenue Report', 'financial', 'Revenue analytics and trends'),
  ('ai-costs-report', 'AI Costs Report', 'financial', 'AI usage costs and optimization'),
  ('agent-usage-report', 'Agent Usage Report', 'analytics', 'Agent performance and usage statistics'),
  ('error-rates-report', 'Error Rates Report', 'analytics', 'System error tracking and analysis'),
  ('user-activity-report', 'User Activity Report', 'analytics', 'User login and activity patterns'),
  ('security-audit-report', 'Security Audit Report', 'security', 'Security events and compliance'),
  ('team-performance-report', 'Team Performance Report', 'team', 'Team member productivity metrics')
ON CONFLICT (key) DO UPDATE SET
  label = EXCLUDED.label,
  category = EXCLUDED.category,
  description = EXCLUDED.description,
  updated_at = now();

-- Insert role-based report permissions
INSERT INTO console_role_report_templates (role, report_key, can_view, can_export, can_configure) VALUES
  -- Owner permissions (full access to all reports)
  ('Owner', 'dashboard-overview', true, true, true),
  ('Owner', 'revenue-report', true, true, true),
  ('Owner', 'ai-costs-report', true, true, true),
  ('Owner', 'agent-usage-report', true, true, true),
  ('Owner', 'error-rates-report', true, true, true),
  ('Owner', 'user-activity-report', true, true, true),
  ('Owner', 'security-audit-report', true, true, true),
  ('Owner', 'team-performance-report', true, true, true),

  -- Admin permissions (view and export most reports, configure some)
  ('Admin', 'dashboard-overview', true, true, true),
  ('Admin', 'revenue-report', true, true, false),
  ('Admin', 'ai-costs-report', true, true, true),
  ('Admin', 'agent-usage-report', true, true, true),
  ('Admin', 'error-rates-report', true, true, true),
  ('Admin', 'user-activity-report', true, true, false),
  ('Admin', 'security-audit-report', true, true, false),
  ('Admin', 'team-performance-report', true, true, true),

  -- Editor permissions (view and export relevant reports)
  ('Editor', 'dashboard-overview', true, true, false),
  ('Editor', 'revenue-report', false, false, false),
  ('Editor', 'ai-costs-report', true, false, false),
  ('Editor', 'agent-usage-report', true, true, false),
  ('Editor', 'error-rates-report', true, false, false),
  ('Editor', 'user-activity-report', false, false, false),
  ('Editor', 'security-audit-report', false, false, false),
  ('Editor', 'team-performance-report', true, false, false),

  -- Viewer permissions (limited view access)
  ('Viewer', 'dashboard-overview', true, false, false),
  ('Viewer', 'revenue-report', false, false, false),
  ('Viewer', 'ai-costs-report', false, false, false),
  ('Viewer', 'agent-usage-report', true, false, false),
  ('Viewer', 'error-rates-report', true, false, false),
  ('Viewer', 'user-activity-report', false, false, false),
  ('Viewer', 'security-audit-report', false, false, false),
  ('Viewer', 'team-performance-report', false, false, false)
ON CONFLICT (role, report_key) DO UPDATE SET
  can_view = EXCLUDED.can_view,
  can_export = EXCLUDED.can_export,
  can_configure = EXCLUDED.can_configure,
  updated_at = now();

-- Enable RLS on new tables
ALTER TABLE console_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE console_role_report_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE console_member_report_perms ENABLE ROW LEVEL SECURITY;

-- RLS policies for console_reports
CREATE POLICY "Team members can view reports list" ON console_reports
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM console_team_members ctm
      WHERE ctm.admin_id = auth.uid()
    )
  );

-- RLS policies for console_role_report_templates  
CREATE POLICY "Team members can view role report templates" ON console_role_report_templates
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM console_team_members ctm
      WHERE ctm.admin_id = auth.uid()
    )
  );

-- RLS policies for console_member_report_perms
CREATE POLICY "Owner or Admin can manage report permissions for their team" ON console_member_report_perms
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM console_team_members ctm1
      JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
      WHERE ctm1.admin_id = auth.uid()
        AND ctm1.role IN ('Owner', 'Admin')
        AND ctm2.id = console_member_report_perms.member_id
    )
  );

CREATE POLICY "Team members can view report permissions for their team" ON console_member_report_perms
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM console_team_members ctm1
      JOIN console_team_members ctm2 ON ctm1.team_id = ctm2.team_id
      WHERE ctm1.admin_id = auth.uid()
        AND ctm2.id = console_member_report_perms.member_id
    )
  );