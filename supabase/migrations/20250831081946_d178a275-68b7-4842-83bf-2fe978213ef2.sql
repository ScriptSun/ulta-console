-- Insert sample users
INSERT INTO public.users (email, full_name, role) VALUES
('john.doe@ultahost.com', 'John Doe', 'admin'),
('sarah.wilson@ultahost.com', 'Sarah Wilson', 'manager'),
('mike.johnson@acmecorp.com', 'Mike Johnson', 'user'),
('emma.davis@techstart.io', 'Emma Davis', 'user'),
('alex.chen@devops.pro', 'Alex Chen', 'manager');

-- Get user IDs for assignment (we'll use the inserted data)
-- Connect users to agents and assign subscription plans
UPDATE public.agents 
SET user_id = (SELECT id FROM public.users WHERE email = 'john.doe@ultahost.com'), 
    plan_key = 'premium_plan'
WHERE id = '11111111-1111-1111-1111-111111111111';

UPDATE public.agents 
SET user_id = (SELECT id FROM public.users WHERE email = 'sarah.wilson@ultahost.com'), 
    plan_key = 'pro_plan'
WHERE id = '406398b1-12d6-419e-bff5-7e1efb1717e2';

UPDATE public.agents 
SET user_id = (SELECT id FROM public.users WHERE email = 'mike.johnson@acmecorp.com'), 
    plan_key = 'starter_plan'
WHERE id = '44444444-4444-4444-4444-444444444444';

UPDATE public.agents 
SET user_id = (SELECT id FROM public.users WHERE email = 'emma.davis@techstart.io'), 
    plan_key = 'free_plan'
WHERE id = '54da12f1-1be1-445c-8bd6-fb8ae94f326e';

UPDATE public.agents 
SET user_id = (SELECT id FROM public.users WHERE email = 'alex.chen@devops.pro'), 
    plan_key = 'pro_plan'
WHERE id = '55555555-5555-5555-5555-555555555555';

-- Add some sample usage data for demonstration
INSERT INTO public.agent_usage (agent_id, usage_type, usage_date, count) VALUES
('11111111-1111-1111-1111-111111111111', 'ai_request', CURRENT_DATE, 45),
('11111111-1111-1111-1111-111111111111', 'server_event', CURRENT_DATE, 120),
('406398b1-12d6-419e-bff5-7e1efb1717e2', 'ai_request', CURRENT_DATE, 32),
('406398b1-12d6-419e-bff5-7e1efb1717e2', 'server_event', CURRENT_DATE, 85),
('44444444-4444-4444-4444-444444444444', 'ai_request', CURRENT_DATE, 18),
('44444444-4444-4444-4444-444444444444', 'server_event', CURRENT_DATE, 42),
('54da12f1-1be1-445c-8bd6-fb8ae94f326e', 'ai_request', CURRENT_DATE, 8),
('54da12f1-1be1-445c-8bd6-fb8ae94f326e', 'server_event', CURRENT_DATE, 15),
('55555555-5555-5555-5555-555555555555', 'ai_request', CURRENT_DATE, 28),
('55555555-5555-5555-5555-555555555555', 'server_event', CURRENT_DATE, 67);