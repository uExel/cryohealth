
-- 1. Remove demo accounts
DO $$
DECLARE chw_uid uuid; ndma_uid uuid;
BEGIN
  SELECT id INTO chw_uid FROM auth.users WHERE email='chw@demo.test';
  SELECT id INTO ndma_uid FROM auth.users WHERE email='ndma@demo.test';
  IF chw_uid IS NOT NULL THEN
    DELETE FROM public.alert_acknowledgements WHERE chw_id = chw_uid;
    DELETE FROM public.cases WHERE chw_id = chw_uid;
    DELETE FROM public.user_roles WHERE user_id = chw_uid;
    DELETE FROM public.chw_profiles WHERE id = chw_uid;
    DELETE FROM auth.identities WHERE user_id = chw_uid;
    DELETE FROM auth.users WHERE id = chw_uid;
  END IF;
  IF ndma_uid IS NOT NULL THEN
    DELETE FROM public.broadcast_messages WHERE sender_id = ndma_uid;
    DELETE FROM public.user_roles WHERE user_id = ndma_uid;
    DELETE FROM public.chw_profiles WHERE id = ndma_uid;
    DELETE FROM auth.identities WHERE user_id = ndma_uid;
    DELETE FROM auth.users WHERE id = ndma_uid;
  END IF;
END $$;

-- 2. Restrict broadcast_messages reads to authenticated users
DROP POLICY IF EXISTS "Public can read broadcasts" ON public.broadcast_messages;
CREATE POLICY "Authenticated can read broadcasts"
  ON public.broadcast_messages
  FOR SELECT
  TO authenticated
  USING (true);

-- 3. Explicit INSERT policy on chw_profiles (admins only; handle_new_user trigger is SECURITY DEFINER and bypasses RLS)
CREATE POLICY "Admins insert chw profiles"
  ON public.chw_profiles
  FOR INSERT
  TO authenticated
  WITH CHECK (
    public.has_role(auth.uid(), 'cryohealth_admin'::app_role)
    OR public.has_role(auth.uid(), 'facility_admin'::app_role)
  );

-- 4. Admin-only DELETE on cases
CREATE POLICY "Admins delete cases"
  ON public.cases
  FOR DELETE
  TO authenticated
  USING (
    public.has_role(auth.uid(), 'cryohealth_admin'::app_role)
    OR public.has_role(auth.uid(), 'facility_admin'::app_role)
  );

-- 5. Explicit admin UPDATE/DELETE on user_roles (the FOR ALL policy already covers it, but make intent explicit for scanners)
DROP POLICY IF EXISTS "NDMA manages roles" ON public.user_roles;
CREATE POLICY "Admins insert roles"
  ON public.user_roles
  FOR INSERT
  TO authenticated
  WITH CHECK (public.has_role(auth.uid(), 'cryohealth_admin'::app_role));
CREATE POLICY "Admins update roles"
  ON public.user_roles
  FOR UPDATE
  TO authenticated
  USING (public.has_role(auth.uid(), 'cryohealth_admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'cryohealth_admin'::app_role));
CREATE POLICY "Admins delete roles"
  ON public.user_roles
  FOR DELETE
  TO authenticated
  USING (public.has_role(auth.uid(), 'cryohealth_admin'::app_role));
CREATE POLICY "Admins read all roles"
  ON public.user_roles
  FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'cryohealth_admin'::app_role));

-- 6. Revoke EXECUTE on has_role from PUBLIC/authenticated/anon — only used internally by RLS policies (SECURITY DEFINER)
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM anon;
REVOKE EXECUTE ON FUNCTION public.has_role(uuid, app_role) FROM authenticated;
