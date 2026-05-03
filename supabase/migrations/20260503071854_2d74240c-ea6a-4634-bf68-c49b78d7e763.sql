CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role user_role)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT CASE
    WHEN _user_id IS NULL THEN false
    WHEN _role = 'admin'::user_role THEN EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = 'admin'::user_role
    ) OR EXISTS (
      SELECT 1
      FROM public.admin_levels al
      WHERE al.user_id = _user_id
    ) OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.role = 'admin'::user_role
    )
    ELSE EXISTS (
      SELECT 1
      FROM public.user_roles ur
      WHERE ur.user_id = _user_id
        AND ur.role = _role
    ) OR EXISTS (
      SELECT 1
      FROM public.profiles p
      WHERE p.user_id = _user_id
        AND p.role = _role
    )
  END
$$;

CREATE OR REPLACE FUNCTION public.is_admin(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT public.has_role(_user_id, 'admin'::user_role)
$$;

CREATE OR REPLACE FUNCTION public.sync_user_role()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.user_id, NEW.role)
  ON CONFLICT (user_id, role) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_user_role ON public.profiles;
CREATE TRIGGER trg_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_user_role();