-- RLS Policy Tests for Team Console
-- Run these tests to verify cross-team isolation and permission enforcement

-- Test Setup: Create test users and teams
BEGIN;

-- Create test admin profiles
INSERT INTO admin_profiles (id, email, full_name) VALUES 
  ('11111111-1111-1111-1111-111111111111', 'owner1@test.com', 'Team 1 Owner'),
  ('22222222-2222-2222-2222-222222222222', 'admin1@test.com', 'Team 1 Admin'),
  ('33333333-3333-3333-3333-333333333333', 'dev1@test.com', 'Team 1 Developer'),
  ('44444444-4444-4444-4444-444444444444', 'owner2@test.com', 'Team 2 Owner'),
  ('55555555-5555-5555-5555-555555555555', 'admin2@test.com', 'Team 2 Admin');

-- Create test teams
INSERT INTO console_teams (id, name, created_by) VALUES
  ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Team Alpha', '11111111-1111-1111-1111-111111111111'),
  ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'Team Beta', '44444444-4444-4444-4444-444444444444');

-- Create team memberships
INSERT INTO console_team_members (id, team_id, admin_id, role) VALUES
  ('m1111111-1111-1111-1111-111111111111', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '11111111-1111-1111-1111-111111111111', 'Owner'),
  ('m2222222-2222-2222-2222-222222222222', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222', 'Admin'),
  ('m3333333-3333-3333-3333-333333333333', 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '33333333-3333-3333-3333-333333333333', 'Developer'),
  ('m4444444-4444-4444-4444-444444444444', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '44444444-4444-4444-4444-444444444444', 'Owner'),
  ('m5555555-5555-5555-5555-555555555555', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', '55555555-5555-5555-5555-555555555555', 'Admin');

-- Create test page permissions
INSERT INTO console_member_page_perms (member_id, page_key, can_view, can_edit, can_delete) VALUES
  ('m3333333-3333-3333-3333-333333333333', 'widgets', true, false, false),
  ('m5555555-5555-5555-5555-555555555555', 'widgets', true, true, false);

-- Create test widget scopes
INSERT INTO console_member_widget_scopes (member_id, widget_id) VALUES
  ('m3333333-3333-3333-3333-333333333333', 'w1111111-1111-1111-1111-111111111111'),
  ('m5555555-5555-5555-5555-555555555555', 'w2222222-2222-2222-2222-222222222222');

COMMIT;

-- TEST 1: Cross-team profile visibility
-- Team 1 Owner should NOT see Team 2 profiles
SET LOCAL "request.jwt.claims" TO '{"sub": "11111111-1111-1111-1111-111111111111"}';
DO $$
DECLARE
  cross_team_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO cross_team_count 
  FROM admin_profiles 
  WHERE id IN ('44444444-4444-4444-4444-444444444444', '55555555-5555-5555-5555-555555555555');
  
  IF cross_team_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Cross-team profile access detected. Count: %', cross_team_count;
  ELSE
    RAISE NOTICE 'PASS: Cross-team profile access blocked';
  END IF;
END $$;

-- TEST 2: Team member can only see their own team
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333"}';
DO $$
DECLARE
  team_count INTEGER;
  cross_team_count INTEGER;
BEGIN
  -- Should see own team
  SELECT COUNT(*) INTO team_count 
  FROM console_team_members 
  WHERE team_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
  
  -- Should NOT see other team
  SELECT COUNT(*) INTO cross_team_count 
  FROM console_team_members 
  WHERE team_id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  
  IF team_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Cannot see own team members. Count: %', team_count;
  ELSIF cross_team_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Can see other team members. Count: %', cross_team_count;
  ELSE
    RAISE NOTICE 'PASS: Team member visibility correct';
  END IF;
END $$;

-- TEST 3: Non-admin cannot write team member data
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333"}';
DO $$
BEGIN
  BEGIN
    UPDATE console_team_members 
    SET role = 'Admin' 
    WHERE id = 'm3333333-3333-3333-3333-333333333333';
    RAISE EXCEPTION 'FAIL: Non-admin was able to update team member role';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Non-admin blocked from updating team member role';
  END;
END $$;

-- TEST 4: Non-admin cannot write page permissions
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333"}';
DO $$
BEGIN
  BEGIN
    UPDATE console_member_page_perms 
    SET can_edit = true 
    WHERE member_id = 'm3333333-3333-3333-3333-333333333333';
    RAISE EXCEPTION 'FAIL: Non-admin was able to update page permissions';
  EXCEPTION WHEN insufficient_privilege THEN
    RAISE NOTICE 'PASS: Non-admin blocked from updating page permissions';
  END;
END $$;

-- TEST 5: Admin can write page permissions for their team
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222"}';
DO $$
BEGIN
  BEGIN
    UPDATE console_member_page_perms 
    SET can_edit = true 
    WHERE member_id = 'm3333333-3333-3333-3333-333333333333';
    RAISE NOTICE 'PASS: Admin can update page permissions in their team';
  EXCEPTION WHEN OTHERS THEN
    RAISE EXCEPTION 'FAIL: Admin blocked from updating page permissions in their team';
  END;
END $$;

-- TEST 6: Admin cannot write page permissions for other teams
SET LOCAL "request.jwt.claims" TO '{"sub": "22222222-2222-2222-2222-222222222222"}';
DO $$
DECLARE
  update_count INTEGER;
BEGIN
  UPDATE console_member_page_perms 
  SET can_edit = true 
  WHERE member_id = 'm5555555-5555-5555-5555-555555555555';
  
  GET DIAGNOSTICS update_count = ROW_COUNT;
  
  IF update_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Admin was able to update page permissions for other team';
  ELSE
    RAISE NOTICE 'PASS: Admin blocked from updating other team page permissions';
  END IF;
END $$;

-- TEST 7: Member can view their own page permissions but not others
SET LOCAL "request.jwt.claims" TO '{"sub": "33333333-3333-3333-3333-333333333333"}';
DO $$
DECLARE
  own_perms_count INTEGER;
  other_perms_count INTEGER;
BEGIN
  -- Should see own permissions
  SELECT COUNT(*) INTO own_perms_count 
  FROM console_member_page_perms 
  WHERE member_id = 'm3333333-3333-3333-3333-333333333333';
  
  -- Should NOT see other team permissions
  SELECT COUNT(*) INTO other_perms_count 
  FROM console_member_page_perms 
  WHERE member_id = 'm5555555-5555-5555-5555-555555555555';
  
  IF own_perms_count = 0 THEN
    RAISE EXCEPTION 'FAIL: Cannot see own page permissions. Count: %', own_perms_count;
  ELSIF other_perms_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Can see other team page permissions. Count: %', other_perms_count;
  ELSE
    RAISE NOTICE 'PASS: Page permission visibility correct for member';
  END IF;
END $$;

-- Cleanup
BEGIN;
DELETE FROM console_member_widget_scopes WHERE member_id LIKE 'm%';
DELETE FROM console_member_page_perms WHERE member_id LIKE 'm%';
DELETE FROM console_team_members WHERE id LIKE 'm%';
DELETE FROM console_teams WHERE id IN ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb');
DELETE FROM admin_profiles WHERE id LIKE '%111111%' OR id LIKE '%222222%' OR id LIKE '%333333%' OR id LIKE '%444444%' OR id LIKE '%555555%';
COMMIT;

-- All tests completed
SELECT 'RLS Policy Tests Completed' as status;