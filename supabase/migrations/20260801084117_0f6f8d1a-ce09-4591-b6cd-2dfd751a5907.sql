
CREATE OR REPLACE FUNCTION public.normalize_ke_phone(_raw text)
RETURNS text
LANGUAGE plpgsql
IMMUTABLE
SET search_path TO 'public'
AS $$
DECLARE d text; local text;
BEGIN
  IF _raw IS NULL THEN RETURN NULL; END IF;
  d := regexp_replace(_raw, '[^0-9+]', '', 'g');
  local := d;
  IF local LIKE '+254%' THEN local := '0' || substring(local from 5);
  ELSIF local LIKE '254%' THEN local := '0' || substring(local from 4);
  END IF;
  IF local ~ '^0[17][0-9]{8}$' THEN RETURN '+254' || substring(local from 2); END IF;
  RETURN NULL;
END; $$;

CREATE OR REPLACE FUNCTION public.validate_profile_fields()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE v_name text; v_phone text;
BEGIN
  v_name := regexp_replace(coalesce(NEW.full_name,''), '\s+', ' ', 'g');
  v_name := btrim(v_name);
  IF length(v_name) < 3 OR v_name !~ '^[A-Za-z][A-Za-z''\u2019.\- ]+$' THEN
    RAISE EXCEPTION 'Invalid full name: use at least 3 letters (spaces, hyphens and apostrophes allowed)';
  END IF;
  NEW.full_name := v_name;

  IF coalesce(NEW.phone,'') <> '' THEN
    v_phone := public.normalize_ke_phone(NEW.phone);
    IF v_phone IS NULL THEN
      RAISE EXCEPTION 'Invalid phone number: enter a valid Kenyan number, e.g. 0712345678';
    END IF;
    NEW.phone := v_phone;
    IF EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.phone = v_phone AND p.user_id <> NEW.user_id
    ) THEN
      RAISE EXCEPTION 'This phone number is already linked to another account';
    END IF;
  END IF;
  RETURN NEW;
END; $$;

DROP TRIGGER IF EXISTS validate_profile_fields_trg ON public.profiles;
CREATE TRIGGER validate_profile_fields_trg
BEFORE INSERT OR UPDATE OF full_name, phone ON public.profiles
FOR EACH ROW EXECUTE FUNCTION public.validate_profile_fields();

CREATE OR REPLACE FUNCTION public.phone_in_use(_phone text)
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.phone = public.normalize_ke_phone(_phone)
      AND public.normalize_ke_phone(_phone) IS NOT NULL
  )
$$;

REVOKE ALL ON FUNCTION public.phone_in_use(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.phone_in_use(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.normalize_ke_phone(text) TO anon, authenticated;
