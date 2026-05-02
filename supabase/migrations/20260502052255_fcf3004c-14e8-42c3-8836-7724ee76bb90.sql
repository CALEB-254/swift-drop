
-- Backfill: ensure any profile with role='admin' has a matching user_roles entry
INSERT INTO public.user_roles (user_id, role)
SELECT p.user_id, p.role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.user_id AND ur.role = p.role
WHERE ur.id IS NULL;

-- Bind sync trigger so future profile inserts/updates propagate to user_roles
DROP TRIGGER IF EXISTS trg_sync_user_role_ins ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_user_role_upd ON public.profiles;

CREATE TRIGGER trg_sync_user_role_ins
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

CREATE TRIGGER trg_sync_user_role_upd
AFTER UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();
