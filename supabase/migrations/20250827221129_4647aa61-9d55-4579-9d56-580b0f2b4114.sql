-- Add admin role for elin@ultahost.com to see demo agents
INSERT INTO public.user_roles (user_id, customer_id, role) 
VALUES (
  '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc',
  '22222222-2222-2222-2222-222222222222', 
  'admin'
) ON CONFLICT (user_id, customer_id, role) DO NOTHING;

-- Also add them to the default team as an admin
INSERT INTO public.team_members (team_id, user_id, role, invited_by)
SELECT 
  t.id,
  '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc',
  'admin',
  '5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc'
FROM public.teams t 
WHERE t.customer_id = '22222222-2222-2222-2222-222222222222'
ON CONFLICT (team_id, user_id) DO NOTHING;