-- Attach triggers that were defined but never bound

-- Notify on package creation
DROP TRIGGER IF EXISTS trg_notify_package_created ON public.packages;
CREATE TRIGGER trg_notify_package_created
AFTER INSERT ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.notify_package_created();

-- Notify on package status change (records actor name in message)
DROP TRIGGER IF EXISTS trg_notify_package_status_change ON public.packages;
CREATE TRIGGER trg_notify_package_status_change
AFTER UPDATE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.notify_package_status_change();

-- Auto-create wallet for each new profile
DROP TRIGGER IF EXISTS trg_create_wallet_for_user ON public.profiles;
CREATE TRIGGER trg_create_wallet_for_user
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

-- Process COD collection -> credit sender wallet
DROP TRIGGER IF EXISTS trg_process_cod_collection ON public.packages;
CREATE TRIGGER trg_process_cod_collection
AFTER UPDATE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.process_cod_collection();

-- Sync profile.role into user_roles whenever profiles change
DROP TRIGGER IF EXISTS trg_sync_user_role ON public.profiles;
CREATE TRIGGER trg_sync_user_role
AFTER INSERT OR UPDATE OF role ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.sync_user_role();

-- updated_at automation on a few key tables
DROP TRIGGER IF EXISTS trg_packages_updated_at ON public.packages;
CREATE TRIGGER trg_packages_updated_at
BEFORE UPDATE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_profiles_updated_at ON public.profiles;
CREATE TRIGGER trg_profiles_updated_at
BEFORE UPDATE ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS trg_wallets_updated_at ON public.wallets;
CREATE TRIGGER trg_wallets_updated_at
BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
