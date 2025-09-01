-- Fix the user_roles to include the correct customer_id for accessing agents
INSERT INTO public.user_roles (user_id, customer_id, role)
VALUES ('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', '22222222-2222-2222-2222-222222222222', 'admin')
ON CONFLICT (user_id, customer_id, role) DO NOTHING;