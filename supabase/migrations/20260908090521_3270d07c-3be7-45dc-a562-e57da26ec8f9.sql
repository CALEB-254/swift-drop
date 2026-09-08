ALTER TABLE public.packages DROP CONSTRAINT IF EXISTS packages_payment_status_check;
ALTER TABLE public.packages ADD CONSTRAINT packages_payment_status_check
CHECK (payment_status = ANY (ARRAY['pending'::text,'processing'::text,'paid'::text,'failed'::text,'pay_on_delivery'::text,'awaiting_payment'::text,'refunded'::text,'cancelled'::text]));