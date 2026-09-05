CREATE OR REPLACE FUNCTION public.admin_set_user_role(_target uuid, _role public.app_role)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  caller_admin boolean;
  caller_gerente boolean;
  target_is_gestor boolean;
  other_active_admin_exists boolean;
BEGIN
  caller_admin := public.has_role(auth.uid(), 'admin');
  caller_gerente := public.has_role(auth.uid(), 'gerente');

  IF NOT (caller_admin OR caller_gerente) THEN
    RAISE EXCEPTION 'Permissão negada';
  END IF;

  IF auth.uid() = _target THEN
    IF NOT caller_admin THEN
      RAISE EXCEPTION 'Apenas administrador pode alterar o próprio cargo';
    END IF;

    IF _role <> 'admin' THEN
      SELECT EXISTS (
        SELECT 1
        FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.role = 'admin'
          AND ur.user_id <> auth.uid()
          AND p.status = 'ativo'
      ) INTO other_active_admin_exists;

      IF NOT other_active_admin_exists THEN
        RAISE EXCEPTION 'Cadastre e ative outro administrador antes de alterar o seu cargo';
      END IF;
    END IF;
  ELSE
    target_is_gestor := EXISTS (
      SELECT 1
      FROM public.user_roles
      WHERE user_id = _target
        AND role::text IN ('admin', 'gerente')
    );

    IF NOT caller_admin THEN
      IF target_is_gestor THEN
        RAISE EXCEPTION 'Apenas administrador pode alterar este usuário';
      END IF;
      IF _role::text IN ('admin', 'gerente') THEN
        RAISE EXCEPTION 'Apenas administrador pode atribuir este cargo';
      END IF;
    END IF;
  END IF;

  DELETE FROM public.user_roles WHERE user_id = _target;
  INSERT INTO public.user_roles (user_id, role) VALUES (_target, _role);
END;
$function$;

REVOKE ALL ON FUNCTION public.admin_set_user_role(uuid, public.app_role) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.admin_set_user_role(uuid, public.app_role) TO authenticated;