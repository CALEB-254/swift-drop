
-- 1. Allow package deletion even when a refund request references it
ALTER TABLE public.refund_requests DROP CONSTRAINT IF EXISTS refund_requests_package_id_fkey;
ALTER TABLE public.refund_requests
  ADD CONSTRAINT refund_requests_package_id_fkey
  FOREIGN KEY (package_id) REFERENCES public.packages(id) ON DELETE SET NULL;

-- 2. Media + category on notifications and broadcasts
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS media_type text;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category text;
ALTER TABLE public.broadcast_notifications ADD COLUMN IF NOT EXISTS media_url text;
ALTER TABLE public.broadcast_notifications ADD COLUMN IF NOT EXISTS media_type text;

-- 3. Storage policies for broadcast media (bucket created separately)
DROP POLICY IF EXISTS "Notification media is publicly readable" ON storage.objects;
CREATE POLICY "Notification media is publicly readable"
ON storage.objects FOR SELECT
USING (bucket_id = 'notification-media');

DROP POLICY IF EXISTS "Admins can upload notification media" ON storage.objects;
CREATE POLICY "Admins can upload notification media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'notification-media' AND public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can delete notification media" ON storage.objects;
CREATE POLICY "Admins can delete notification media"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'notification-media' AND public.is_admin(auth.uid()));

-- 4. Realtime for notifications
ALTER TABLE public.notifications REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications';
  EXCEPTION WHEN duplicate_object THEN NULL;
  END;
END $$;

-- 5. Public (no-login) tracking lookup
CREATE OR REPLACE FUNCTION public.get_public_tracking(_tracking_number text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  p RECORD;
  events jsonb;
BEGIN
  SELECT * INTO p FROM public.packages
  WHERE lower(tracking_number) = lower(trim(_tracking_number))
  LIMIT 1;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  SELECT COALESCE(jsonb_agg(jsonb_build_object(
           'id', n.id, 'title', n.title, 'message', n.message,
           'type', n.type, 'created_at', n.created_at
         ) ORDER BY n.created_at), '[]'::jsonb)
  INTO events
  FROM (
    SELECT DISTINCT ON (title, message) id, title, message, type, created_at
    FROM public.notifications
    WHERE tracking_number = p.tracking_number
    ORDER BY title, message, created_at
  ) n;

  RETURN jsonb_build_object(
    'found', true,
    'tracking_number', p.tracking_number,
    'status', p.status,
    'delivery_type', p.delivery_type,
    'pickup_point', p.pickup_point,
    'receiver_name', left(p.receiver_name, 2) || repeat('*', greatest(length(p.receiver_name) - 2, 0)),
    'sender_name', left(p.sender_name, 2) || repeat('*', greatest(length(p.sender_name) - 2, 0)),
    'destination', COALESCE(p.pickup_point, p.receiver_address),
    'created_at', p.created_at,
    'updated_at', p.updated_at,
    'events', events
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_tracking(text) FROM public;
GRANT EXECUTE ON FUNCTION public.get_public_tracking(text) TO anon, authenticated;
