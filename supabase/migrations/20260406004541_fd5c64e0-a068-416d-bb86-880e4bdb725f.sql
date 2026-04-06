
-- Fix: Drop the restrictive agents INSERT policy and recreate properly
DROP POLICY IF EXISTS "Admins can insert agents" ON public.agents;
CREATE POLICY "Admins can insert agents"
ON public.agents FOR INSERT
TO authenticated
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Add COD fields to packages
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS cod_amount numeric DEFAULT 0;
ALTER TABLE public.packages ADD COLUMN IF NOT EXISTS cod_collected boolean DEFAULT false;

-- Create wallets table
CREATE TABLE IF NOT EXISTS public.wallets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  balance numeric NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own wallet" ON public.wallets
FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can view all wallets" ON public.wallets
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Create wallet_transactions table
CREATE TABLE IF NOT EXISTS public.wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'deposit',
  amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'completed',
  reference text,
  description text,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own transactions" ON public.wallet_transactions
FOR SELECT TO authenticated
USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

CREATE POLICY "Admins can view all transactions" ON public.wallet_transactions
FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::user_role));

-- Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS public.withdrawal_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_id uuid NOT NULL REFERENCES public.wallets(id) ON DELETE CASCADE,
  amount numeric NOT NULL,
  phone text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  mpesa_receipt text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.withdrawal_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own withdrawals" ON public.withdrawal_requests
FOR SELECT TO authenticated
USING (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

CREATE POLICY "Users can create withdrawal requests" ON public.withdrawal_requests
FOR INSERT TO authenticated
WITH CHECK (wallet_id IN (SELECT id FROM public.wallets WHERE user_id = auth.uid()));

CREATE POLICY "Admins can manage all withdrawals" ON public.withdrawal_requests
FOR ALL TO authenticated USING (has_role(auth.uid(), 'admin'::user_role))
WITH CHECK (has_role(auth.uid(), 'admin'::user_role));

-- Trigger: auto-create wallet when profile is created
CREATE OR REPLACE FUNCTION public.create_wallet_for_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.wallets (user_id) VALUES (NEW.user_id)
  ON CONFLICT (user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS create_wallet_on_profile ON public.profiles;
CREATE TRIGGER create_wallet_on_profile
AFTER INSERT ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.create_wallet_for_user();

-- Trigger: deposit COD amount to sender wallet when collected
CREATE OR REPLACE FUNCTION public.process_cod_collection()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sender_wallet_id uuid;
BEGIN
  IF NEW.cod_collected = true AND OLD.cod_collected = false AND NEW.cod_amount > 0 THEN
    SELECT id INTO sender_wallet_id FROM public.wallets WHERE user_id = NEW.user_id;
    IF sender_wallet_id IS NOT NULL THEN
      UPDATE public.wallets SET balance = balance + NEW.cod_amount, updated_at = now() WHERE id = sender_wallet_id;
      INSERT INTO public.wallet_transactions (wallet_id, type, amount, status, reference, description)
      VALUES (sender_wallet_id, 'deposit', NEW.cod_amount, 'completed', NEW.tracking_number, 'COD payment for package ' || NEW.tracking_number);
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS process_cod_on_package ON public.packages;
CREATE TRIGGER process_cod_on_package
BEFORE UPDATE ON public.packages
FOR EACH ROW EXECUTE FUNCTION public.process_cod_collection();

-- Auto-update timestamps
CREATE TRIGGER update_wallets_updated_at BEFORE UPDATE ON public.wallets
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_withdrawal_requests_updated_at BEFORE UPDATE ON public.withdrawal_requests
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
