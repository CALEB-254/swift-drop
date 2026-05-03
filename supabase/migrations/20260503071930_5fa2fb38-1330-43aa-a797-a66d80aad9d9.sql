REVOKE EXECUTE ON FUNCTION public.has_role(uuid, user_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_user_role(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.get_admin_level(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.is_super_admin(uuid) FROM anon;
REVOKE EXECUTE ON FUNCTION public.sync_user_role() FROM anon;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM anon;
REVOKE EXECUTE ON FUNCTION public.process_cod_collection() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_package_created() FROM anon;
REVOKE EXECUTE ON FUNCTION public.notify_package_status_change() FROM anon;

REVOKE EXECUTE ON FUNCTION public.sync_user_role() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.create_wallet_for_user() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.process_cod_collection() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_package_created() FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.notify_package_status_change() FROM authenticated;

GRANT EXECUTE ON FUNCTION public.has_role(uuid, user_role) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_admin(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_role(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_admin_level(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.is_super_admin(uuid) TO authenticated;