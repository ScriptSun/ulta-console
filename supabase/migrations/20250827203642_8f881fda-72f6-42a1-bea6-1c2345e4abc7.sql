-- Add policy to allow viewing default/system policies
CREATE POLICY "Anyone can read default system policies" 
ON public.command_policies 
FOR SELECT 
USING (customer_id = '00000000-0000-0000-0000-000000000001');

-- Also allow viewing default policies in policy_history
CREATE POLICY "Anyone can read default system policy history" 
ON public.policy_history 
FOR SELECT 
USING (
  EXISTS (
    SELECT 1 FROM public.command_policies cp 
    WHERE cp.id = policy_history.policy_id AND 
    cp.customer_id = '00000000-0000-0000-0000-000000000001'
  )
);