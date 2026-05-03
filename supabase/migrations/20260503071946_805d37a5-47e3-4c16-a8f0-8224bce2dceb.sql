REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.get_admin_level(uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM authenticated;