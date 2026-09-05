
-- Extend role enum
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'gerente';
ALTER TYPE public.app_role ADD VALUE IF NOT EXISTS 'estoquista';

-- Status enum
DO $$ BEGIN
  CREATE TYPE public.user_status AS ENUM ('pendente','ativo','bloqueado');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

-- Profile columns
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS status public.user_status NOT NULL DEFAULT 'pendente',
  ADD COLUMN IF NOT EXISTS last_access_at timestamptz;

-- Existing users stay active
UPDATE public.profiles SET status = 'ativo' WHERE status = 'pendente';

-- Helper: is caller a manager (admin or gerente)
CREATE OR REPLACE FUNCTION public.is_manager(_uid uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _uid AND role::text IN ('admin','gerente')
  )
$$;
GRANT EXECUTE ON FUNCTION public.is_manager(uuid) TO authenticated;

-- Managers can view all profiles / roles
DROP POLICY IF EXISTS "managers_view_all_profiles" ON public.profiles;
CREATE POLICY "managers_view_all_profiles" ON public.profiles
FOR SELECT TO authenticated
USING (public.is_manager(auth.uid()));

DROP POLICY IF EXISTS "managers_view_all_roles" ON public.user_roles;
CREATE POLICY "managers_view_all_roles" ON public.user_roles
FOR SELECT TO authenticated
USING (public.is_manager(auth.uid()));

-- Updated signup: pendente + funcionario (first user = admin + ativo)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  user_count int;
BEGIN
  SELECT count(*) INTO user_count FROM auth.users;
  IF user_count = 1 THEN
    INSERT INTO public.profiles (id, full_name, email, status)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email, 'ativo');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'admin');
  ELSE
    INSERT INTO public.profiles (id, full_name, email, status)
    VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email,'@',1)), NEW.email, 'pendente');
    INSERT INTO public.user_roles (user_id, role) VALUES (NEW.id, 'funcionario');
  END IF;
  RETURN NEW;
END;
$$;

-- Set user status (approve/reject/block/activate)
CREATE OR REPLACE FUNCTION public.admin_set_user_status(_target uuid, _status public.user_status)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF auth.uid() = _target THEN
    RAISE EXCEPTION 'Não é possível alterar o próprio status';
  END IF;
  UPDATE public.profiles SET status = _status WHERE id = _target;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_status(uuid, public.user_status) TO authenticated;

-- Set user role
CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target uuid, _role public.app_role)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  caller_admin boolean;
  caller_gerente boolean;
  target_is_gestor boolean;
BEGIN
  caller_admin := public.has_role(auth.uid(), 'admin');
  caller_gerente := public.has_role(auth.uid(), 'gerente');
  IF NOT (caller_admin OR caller_gerente) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  IF auth.uid() = _target THEN
    RAISE EXCEPTION 'Não é possível alterar o próprio cargo';
  END IF;
  target_is_gestor := EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _target AND role::text IN ('admin','gerente')
  );
  IF NOT caller_admin THEN
    IF target_is_gestor THEN
      RAISE EXCEPTION 'Apenas administrador pode alterar este usuário';
    END IF;
    IF _role::text IN ('admin','gerente') THEN
      RAISE EXCEPTION 'Apenas administrador pode atribuir este cargo';
    END IF;
  END IF;
  DELETE FROM public.user_roles WHERE user_id = _target;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role);
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;

-- Update profile basic info (name)
CREATE OR REPLACE FUNCTION public.admin_update_profile(_target uuid, _full_name text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.is_manager(auth.uid()) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;
  UPDATE public.profiles SET full_name = _full_name WHERE id = _target;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_update_profile(uuid, text) TO authenticated;

-- Delete user (admin only)
CREATE OR REPLACE FUNCTION public.admin_delete_user(_target uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NOT public.has_role(auth.uid(), 'admin') THEN
    RAISE EXCEPTION 'Apenas administrador pode excluir usuários';
  END IF;
  IF auth.uid() = _target THEN
    RAISE EXCEPTION 'Não é possível excluir a si mesmo';
  END IF;
  DELETE FROM auth.users WHERE id = _target;
END; $$;
GRANT EXECUTE ON FUNCTION public.admin_delete_user(uuid) TO authenticated;

-- Record last access
CREATE OR REPLACE FUNCTION public.touch_last_access()
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE public.profiles SET last_access_at = now() WHERE id = auth.uid();
$$;
GRANT EXECUTE ON FUNCTION public.touch_last_access() TO authenticated;

-- Return own status (for pending/blocked check without hitting RLS restrictions)
CREATE OR REPLACE FUNCTION public.my_status()
RETURNS public.user_status LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT status FROM public.profiles WHERE id = auth.uid()
$$;
GRANT EXECUTE ON FUNCTION public.my_status() TO authenticated;
