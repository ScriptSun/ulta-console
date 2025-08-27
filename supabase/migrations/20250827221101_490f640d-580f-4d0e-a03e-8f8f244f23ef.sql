-- Add admin role for the current user to see demo agents
INSERT INTO public.user_roles (user_id, customer_id, role) 
VALUES (
  '24d4d38f-8bc7-4270-984b-3c9f62e14cb1',
  '22222222-2222-2222-2222-222222222222', 
  'admin'
) ON CONFLICT (user_id, customer_id, role) DO NOTHING;

-- Also add them to the default team as an admin
INSERT INTO public.team_members (team_id, user_id, role, invited_by)
SELECT 
  t.id,
  '24d4d38f-8bc7-4270-984b-3c9f62e14cb1',
  'admin',
  '24d4d38f-8bc7-4270-984b-3c9f62e14cb1'
FROM public.teams t 
WHERE t.customer_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT (team_id, user_id) DO NOTHING;