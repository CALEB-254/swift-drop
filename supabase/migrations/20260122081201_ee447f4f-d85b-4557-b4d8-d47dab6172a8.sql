-- Fix the permissive INSERT policy - restrict to authenticated users inserting for themselves
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Users can insert their own notifications"
  ON public.notifications FOR INSERT
  WITH CHECK (auth.uid() = user_id);