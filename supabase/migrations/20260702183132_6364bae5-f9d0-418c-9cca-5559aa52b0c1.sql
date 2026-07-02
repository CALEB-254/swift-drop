
-- Packages: keep one trigger per purpose
DROP TRIGGER IF EXISTS package_created_notification ON public.packages;
DROP TRIGGER IF EXISTS on_package_status_change ON public.packages;
DROP TRIGGER IF EXISTS package_status_notification ON public.packages;
DROP TRIGGER IF EXISTS process_cod_on_package ON public.packages;
DROP TRIGGER IF EXISTS update_packages_updated_at ON public.packages;

-- Profiles: dedupe
DROP TRIGGER IF EXISTS create_wallet_on_profile ON public.profiles;
DROP TRIGGER IF EXISTS sync_profile_role ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_user_role_ins ON public.profiles;
DROP TRIGGER IF EXISTS trg_sync_user_role_upd ON public.profiles;
DROP TRIGGER IF EXISTS update_profiles_updated_at ON public.profiles;
