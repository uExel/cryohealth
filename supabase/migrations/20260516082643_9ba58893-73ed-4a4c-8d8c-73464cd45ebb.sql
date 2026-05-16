
DO $$
DECLARE
  chw_uid uuid;
  ndma_uid uuid;
  hunza_id uuid;
  gilgit_id uuid;
BEGIN
  SELECT id INTO hunza_id FROM public.districts WHERE name='Hunza-Nagar' LIMIT 1;
  SELECT id INTO gilgit_id FROM public.districts WHERE name='Gilgit' LIMIT 1;

  SELECT id INTO chw_uid FROM auth.users WHERE email='chw@demo.test';
  IF chw_uid IS NULL THEN
    chw_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', chw_uid, 'authenticated', 'authenticated',
      'chw@demo.test', crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Aliya Khan (Demo CHW)"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), chw_uid,
            jsonb_build_object('sub', chw_uid::text, 'email','chw@demo.test'),
            'email', chw_uid::text, now(), now(), now());
  END IF;

  SELECT id INTO ndma_uid FROM auth.users WHERE email='ndma@demo.test';
  IF ndma_uid IS NULL THEN
    ndma_uid := gen_random_uuid();
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password,
      email_confirmed_at, created_at, updated_at,
      raw_app_meta_data, raw_user_meta_data, confirmation_token,
      email_change, email_change_token_new, recovery_token
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', ndma_uid, 'authenticated', 'authenticated',
      'ndma@demo.test', crypt('demo1234', gen_salt('bf')),
      now(), now(), now(),
      '{"provider":"email","providers":["email"]}'::jsonb,
      '{"full_name":"Imran Raza (NDMA Admin)"}'::jsonb,
      '', '', '', ''
    );
    INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at)
    VALUES (gen_random_uuid(), ndma_uid,
            jsonb_build_object('sub', ndma_uid::text, 'email','ndma@demo.test'),
            'email', ndma_uid::text, now(), now(), now());
  END IF;

  INSERT INTO public.chw_profiles (id, full_name, phone, language, district_id)
  VALUES (chw_uid, 'Aliya Khan (Demo CHW)', '+92-300-1234567', 'ur', hunza_id)
  ON CONFLICT (id) DO UPDATE SET district_id = EXCLUDED.district_id, phone = EXCLUDED.phone, full_name = EXCLUDED.full_name;

  INSERT INTO public.chw_profiles (id, full_name, phone, language, district_id)
  VALUES (ndma_uid, 'Imran Raza (NDMA Admin)', '+92-300-7654321', 'en', gilgit_id)
  ON CONFLICT (id) DO UPDATE SET district_id = EXCLUDED.district_id, full_name = EXCLUDED.full_name;

  INSERT INTO public.user_roles (user_id, role) VALUES (chw_uid, 'chw') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (ndma_uid, 'ndma') ON CONFLICT DO NOTHING;
  INSERT INTO public.user_roles (user_id, role) VALUES (ndma_uid, 'facility_admin') ON CONFLICT DO NOTHING;

  INSERT INTO public.cases (chw_id, district_id, patient_age, patient_sex, symptoms, diagnosis, treatment, outcome, is_disaster_related, created_at) VALUES
    (chw_uid, hunza_id, 4, 'F', 'Fever 39°C, cough, fast breathing', 'Suspected pneumonia (IMNCI)', 'Amoxicillin DT 250mg BID x5d; refer if no improvement 48h', 'refer', false, now() - interval '6 days'),
    (chw_uid, hunza_id, 27, 'F', 'Watery diarrhoea x3 days, mild dehydration', 'Acute gastroenteritis', 'ORS + zinc 20mg OD x10d', 'treat_at_home', false, now() - interval '3 days'),
    (chw_uid, hunza_id, 58, 'M', 'Chest trauma after evacuation, abrasions, anxiety', 'Soft-tissue injury post-GLOF alert', 'Wound care, tetanus toxoid, paracetamol; psychosocial check', 'emergency', true, now() - interval '1 day'),
    (chw_uid, hunza_id, 2, 'M', 'Hypothermia signs after relocation to camp', 'Mild hypothermia', 'Passive rewarming, warm fluids, monitored 4h', 'treat_at_home', true, now() - interval '12 hours')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.broadcast_messages (sender_id, district_id, message, created_at) VALUES
    (ndma_uid, hunza_id, 'Daily situation report: Shisper monitoring continues. All BHUs report stocks adequate for 72h surge.', now() - interval '2 days'),
    (ndma_uid, gilgit_id, 'Reminder: submit weekly IDSR line list by 18:00 today via /chw.', now() - interval '8 hours')
  ON CONFLICT DO NOTHING;

  INSERT INTO public.alert_acknowledgements (alert_id, chw_id)
  SELECT a.id, chw_uid FROM public.alerts a ORDER BY a.created_at DESC LIMIT 1
  ON CONFLICT DO NOTHING;
END $$;
