-- Allow admins to insert packages on behalf of any user
CREATE POLICY "Admins can insert packages"
ON public.packages
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

-- Allow admins to insert agents records for arbitrary users
-- (existing policy already requires admin role, which is fine — no change needed for agents)

-- Allow admins to insert profiles for arbitrary users (used as fallback)
CREATE POLICY "Admins can insert profiles"
ON public.profiles
FOR INSERT
TO authenticated
WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));
