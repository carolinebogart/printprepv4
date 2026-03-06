CREATE TABLE public.system_events (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type text NOT NULL,
  severity text NOT NULL DEFAULT 'error',
  message text NOT NULL,
  details jsonb,
  user_id uuid REFERENCES auth.users(id),
  image_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_system_events_created ON public.system_events(created_at DESC);
CREATE INDEX idx_system_events_type ON public.system_events(event_type);

ALTER TABLE public.system_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can read system_events"
  ON public.system_events FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM public.admin_users
    WHERE admin_users.user_id = auth.uid()
    AND admin_users.is_active = true
  ));
