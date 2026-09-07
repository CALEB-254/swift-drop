
REVOKE EXECUTE ON FUNCTION public.notify_rider_package_events() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_cash_collection_result() FROM anon, authenticated, public;
REVOKE EXECUTE ON FUNCTION public.notify_admins(text, text, text, text, text) FROM public;
