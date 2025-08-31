-- Create user_page_permissions table (simplified approach)

-- Create user_page_permissions table
CREATE TABLE IF NOT EXISTS public.user_page_permissions (
    user_id uuid NOT NULL,
    page_key text NOT NULL,
    can_view boolean DEFAULT true,
    can_edit boolean DEFAULT false,
    can_delete boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    PRIMARY KEY (user_id, page_key)
);

-- Enable RLS
ALTER TABLE public.user_page_permissions ENABLE ROW LEVEL SECURITY;

-- Create basic RLS policies
CREATE POLICY "user_page_permissions_select" ON public.user_page_permissions FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "user_page_permissions_insert" ON public.user_page_permissions FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY "user_page_permissions_update" ON public.user_page_permissions FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "user_page_permissions_delete" ON public.user_page_permissions FOR DELETE USING (user_id = auth.uid());

-- Give elin owner permissions for key pages to start with
INSERT INTO public.user_page_permissions (user_id, page_key, can_view, can_edit, can_delete) VALUES 
('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'dashboard', true, true, true),
('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'team-management', true, true, true),
('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'users', true, true, true),
('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'agents', true, true, true),
('5bb0dbc1-471d-4ac6-9be8-f851a59ef3fc', 'scripts', true, true, true);