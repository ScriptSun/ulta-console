-- Allow admins and users with proper roles to update user profiles
CREATE POLICY "Admins can update user profiles" 
ON public.admin_profiles 
FOR UPDATE 
USING (
  (auth.uid() = id) OR 
  (EXISTS ( 
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])
  )) OR
  is_admin()
)
WITH CHECK (
  (auth.uid() = id) OR 
  (EXISTS ( 
    SELECT 1 
    FROM user_roles ur 
    WHERE ur.user_id = auth.uid() 
    AND ur.role = ANY (ARRAY['owner'::app_role, 'admin'::app_role])
  )) OR
  is_admin()
);