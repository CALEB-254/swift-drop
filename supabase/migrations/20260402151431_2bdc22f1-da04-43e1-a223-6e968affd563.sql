
-- 1. Fix profiles: restrict role on INSERT and UPDATE
DROP POLICY IF EXISTS "Users can insert their own profile" ON public.profiles;
CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id AND role = 'sender'::user_role);

DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
CREATE POLICY "Users can update their own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id AND role = (SELECT p.role FROM public.profiles p WHERE p.user_id = auth.uid() LIMIT 1));

-- 2. Fix agents: remove self-insert policy
DROP POLICY IF EXISTS "Agents can insert their own record" ON public.agents;

-- 3. Fix agents: restrict public SELECT to authenticated users
DROP POLICY IF EXISTS "Anyone can view active agents" ON public.agents;
CREATE POLICY "Authenticated users can view active agents"
  ON public.agents FOR SELECT
  TO authenticated
  USING (is_active = true);

-- 4. Fix user_roles: add admin-only INSERT and DELETE policies
CREATE POLICY "Only admins can insert roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'admin'::user_role));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::user_role));
