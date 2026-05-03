
-- Backfill profiles for auth.users missing them, and ensure new signups always get a profile

-- 1. Backfill missing profiles
INSERT INTO public.profiles (user_id, full_name, phone, role)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', split_part(u.email, '@', 1), 'User'),
  COALESCE(u.raw_user_meta_data->>'phone', ''),
  CASE 
    WHEN u.raw_user_meta_data->>'role' IN ('sender','agent','admin') THEN (u.raw_user_meta_data->>'role')::user_role
    ELSE 'sender'::user_role
  END
FROM auth.users u
LEFT JOIN public.profiles p ON p.user_id = u.id
WHERE p.user_id IS NULL
ON CONFLICT (user_id) DO NOTHING;

-- 2. Backfill user_roles for those profiles
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, p.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = p.role
WHERE ur.user_id IS NULL
ON CONFLICT (user_id, role) DO NOTHING;

-- 3. Create handle_new_user function + trigger on auth.users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role user_role;
BEGIN
  v_role := CASE 
    WHEN NEW.raw_user_meta_data->>'role' IN ('sender','agent','admin') 
    THEN (NEW.raw_user_meta_data->>'role')::user_role
    ELSE 'sender'::user_role
  END;

  INSERT INTO public.profiles (user_id, full_name, phone, role)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1), 'User'),
    COALESCE(NEW.raw_user_meta_data->>'phone', ''),
    v_role
  )
  ON CONFLICT (user_id) DO NOTHING;

  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, v_role)
  ON CONFLICT (user_id, role) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
