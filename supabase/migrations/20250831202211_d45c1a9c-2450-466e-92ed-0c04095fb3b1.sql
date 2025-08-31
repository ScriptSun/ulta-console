-- Update RLS policies for user_page_permissions to avoid recursion and simplify team logic

-- Drop existing policies
DROP POLICY IF EXISTS "Users can view their own permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "Users can manage their own permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "Admins can manage all user permissions" ON public.user_page_permissions;
DROP POLICY IF EXISTS "user_page_permissions_select" ON public.user_page_permissions;
DROP POLICY IF EXISTS "user_page_permissions_insert" ON public.user_page_permissions;
DROP POLICY IF EXISTS "user_page_permissions_update" ON public.user_page_permissions;
DROP POLICY IF EXISTS "user_page_permissions_delete" ON public.user_page_permissions;

-- SELECT policy: Users can see their own permissions OR if they are Owner/Admin
CREATE POLICY "user_page_permissions_select_policy"
ON public.user_page_permissions FOR SELECT
USING (
  auth.uid() = user_id 
  OR 
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- INSERT policy: Only Owner/Admin can insert permissions for any user
CREATE POLICY "user_page_permissions_insert_policy"
ON public.user_page_permissions FOR INSERT
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- UPDATE policy: Only Owner/Admin can update permissions for any user
CREATE POLICY "user_page_permissions_update_policy"
ON public.user_page_permissions FOR UPDATE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);

-- DELETE policy: Only Owner/Admin can delete permissions for any user
CREATE POLICY "user_page_permissions_delete_policy"
ON public.user_page_permissions FOR DELETE
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role IN ('owner', 'admin')
  )
);